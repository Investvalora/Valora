import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { flushSync } from 'react-dom'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'

// O dublê substitui o client Supabase, e não o `positionService`: assim o
// service real roda e o teste inspeciona o payload que iria para o banco —
// é o que permite afirmar de onde vem o `user_id`.
vi.mock('../../../shared/services/supabaseClient', async () => {
  const { supabaseMock } = await import('../../../test/supabaseMock')
  return { supabase: supabaseMock.client }
})

import { resetSupabaseMock, supabaseMock } from '../../../test/supabaseMock'
import { Modal } from '../../../shared/components/Modal'
import { useAuthStore } from '../../auth/store'
import { AddPositionForm } from './AddPositionForm'

const SESSION_USER_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_SESSION_USER_ID = '22222222-2222-4222-8222-222222222222'

const CATALOG_ASSET = {
  ticker: 'PETR4',
  name: 'Petrobras PN',
  type: 'stock_br',
  currency: 'BRL',
}

/**
 * Erro de unicidade como o Postgres o produz. O texto cru aparece aqui e em
 * nenhum lugar da interface — é exatamente o que a linha da matriz exige.
 */
const DUPLICATE_ERROR = {
  code: '23505',
  message: 'duplicate key value violates unique constraint "positions_user_id_ticker_idx"',
  details: `Key (user_id, ticker)=(${SESSION_USER_ID}, PETR4) already exists.`,
  hint: null,
}

const RAW_POSTGRES_FRAGMENTS = [
  'duplicate key',
  'positions_user_id_ticker_idx',
  'Key (user_id, ticker)',
  'violates unique constraint',
]

function signIn(userId: string) {
  useAuthStore.setState({
    user: { id: userId } as User,
    session: { user: { id: userId } } as Session,
    loading: false,
  })
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

/** Catálogo respondendo tanto ao lookup exato quanto ao autocomplete. */
function catalogReturns(asset: Record<string, unknown> | null) {
  supabaseMock.on('assets', (chain) => {
    const isExactLookup = chain.calls.some((call) => call.method === 'maybeSingle')
    if (isExactLookup) return { data: asset, error: null }
    return { data: asset ? [asset] : [], error: null }
  })
}

function renderForm(queryClient: QueryClient, onSuccess = vi.fn(), onCancel = vi.fn()) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  render(<AddPositionForm onSuccess={onSuccess} onCancel={onCancel} />, { wrapper })

  return { onSuccess, onCancel }
}

/** Preenche e submete o formulário. Decimais em formato pt-BR de propósito. */
async function fillAndSubmit(ticker: string) {
  const user = userEvent.setup()

  await user.type(screen.getByLabelText('Ativo'), ticker)
  await user.type(screen.getByLabelText('Quantidade'), '100')
  await user.type(screen.getByLabelText('Preço médio'), '32,10')
  fireEvent.change(screen.getByLabelText('Data de aquisição'), {
    target: { value: '2026-01-15' },
  })

  await user.click(screen.getByRole('button', { name: 'Adicionar posição' }))
}

beforeEach(() => {
  resetSupabaseMock()
  useAuthStore.setState({ user: null, session: null, loading: false })
  // A mensagem de diagnóstico do componente vai para o console, nunca à tela.
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('AddPositionForm — cadastro válido (linha da matriz)', () => {
  it('insere com o user_id da sessão e invalida a query key das posições', async () => {
    signIn(SESSION_USER_ID)
    catalogReturns(CATALOG_ASSET)
    supabaseMock.on('positions', () => ({
      data: { id: 'pos-1', user_id: SESSION_USER_ID, ticker: 'PETR4' },
      error: null,
    }))

    const queryClient = createQueryClient()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    const { onSuccess } = renderForm(queryClient)

    await fillAndSubmit('PETR4')

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('PETR4'))

    const payloads = supabaseMock.insertPayloads('positions')
    expect(payloads).toHaveLength(1)

    const [payload] = payloads
    // Decimal pt-BR normalizado antes de sair, e nenhuma coluna a mais.
    expect(payload).toEqual({
      user_id: SESSION_USER_ID,
      ticker: 'PETR4',
      quantity: 100,
      average_price: 32.1,
      acquisition_date: '2026-01-15',
    })

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['portfolio', 'positions', SESSION_USER_ID],
    })
  })

  it('tira o user_id da sessão corrente, não de um valor fixo nem do formulário', async () => {
    signIn(OTHER_SESSION_USER_ID)
    catalogReturns(CATALOG_ASSET)
    supabaseMock.on('positions', () => ({
      data: { id: 'pos-2', user_id: OTHER_SESSION_USER_ID, ticker: 'PETR4' },
      error: null,
    }))

    const queryClient = createQueryClient()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    const { onSuccess } = renderForm(queryClient)

    await fillAndSubmit('PETR4')

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('PETR4'))

    const [payload] = supabaseMock.insertPayloads('positions')
    expect(payload.user_id).toBe(OTHER_SESSION_USER_ID)
    // O formulário não tem campo de usuário: o único user_id possível é o da
    // sessão. Confirma que nenhum campo visível o oferece.
    expect(screen.queryByLabelText(/usu[áa]rio|user/i)).toBeNull()

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['portfolio', 'positions', OTHER_SESSION_USER_ID],
    })
  })
})

describe('AddPositionForm — posição duplicada (linha da matriz)', () => {
  it('traduz o SQLSTATE 23505 em mensagem que nomeia o ticker', async () => {
    signIn(SESSION_USER_ID)
    catalogReturns(CATALOG_ASSET)
    supabaseMock.on('positions', () => ({ data: null, error: DUPLICATE_ERROR }))

    const { onSuccess } = renderForm(createQueryClient())

    await fillAndSubmit('PETR4')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(
      'Você já tem uma posição em PETR4. Edite a posição existente em vez de cadastrar outra.',
    )
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('não vaza o texto cru do Postgres para a interface', async () => {
    signIn(SESSION_USER_ID)
    catalogReturns(CATALOG_ASSET)
    supabaseMock.on('positions', () => ({ data: null, error: DUPLICATE_ERROR }))

    renderForm(createQueryClient())

    await fillAndSubmit('PETR4')
    await screen.findByRole('alert')

    for (const fragment of RAW_POSTGRES_FRAGMENTS) {
      expect(document.body.textContent).not.toContain(fragment)
    }
    expect(document.body.textContent).not.toContain('23505')
  })
})

describe('AddPositionForm — ticker fora do catálogo (linha da matriz)', () => {
  it('mostra "Ativo não encontrado" e bloqueia o submit', async () => {
    signIn(SESSION_USER_ID)
    catalogReturns(null)
    supabaseMock.on('positions', () => ({ data: null, error: null }))

    const { onSuccess } = renderForm(createQueryClient())

    await fillAndSubmit('PETR99')

    expect(await screen.findByText('Ativo não encontrado')).toBeInTheDocument()

    // O bloqueio é no cliente, antes de qualquer escrita: a FK nunca é violada.
    expect(supabaseMock.chainsWith('positions', 'insert')).toHaveLength(0)
    expect(onSuccess).not.toHaveBeenCalled()

    // E o catálogo foi de fato consultado pelo ticker digitado.
    expect(supabaseMock.callArgs('assets', 'eq')).toContainEqual(['ticker', 'PETR99'])
  })
})

describe('AddPositionForm — mapeamento dos SQLSTATE', () => {
  /** Roda o submit contra um erro de escrita e devolve o texto do alerta. */
  async function submitAgainst(error: unknown): Promise<string> {
    catalogReturns(CATALOG_ASSET)
    supabaseMock.on('positions', () => ({ data: null, error }))

    const { onSuccess } = renderForm(createQueryClient())
    await fillAndSubmit('PETR4')

    const alert = await screen.findByRole('alert')
    expect(onSuccess).not.toHaveBeenCalled()

    return alert.textContent ?? ''
  }

  it('23514 (CHECK violado) explica quantidade e preço, sem culpar o ticker', async () => {
    signIn(SESSION_USER_ID)

    const message = await submitAgainst({
      code: '23514',
      message: 'new row for relation "positions" violates check constraint "positions_quantity_positiva"',
      details: null,
      hint: null,
    })

    expect(message).toBe(
      'Valores fora do permitido: quantidade precisa ser maior que zero e preço médio não pode ser negativo.',
    )
    expect(message).not.toContain('positions_quantity_positiva')
  })

  it('42501 (RLS recusou) manda entrar novamente, em vez de sugerir falta de permissão', async () => {
    signIn(SESSION_USER_ID)

    const message = await submitAgainst({
      code: '42501',
      message: 'new row violates row-level security policy for table "positions"',
      details: null,
      hint: null,
    })

    expect(message).toBe('Sua sessão não está mais válida. Entre novamente e repita o cadastro.')
    expect(message).not.toContain('row-level security')
  })

  // `positions` tem duas FKs e as duas produzem 23503. Mandar corrigir o ticker
  // quando o que falta é a linha em `public.users` aponta o campo errado.
  it('23503 na FK de ticker culpa o ticker', async () => {
    signIn(SESSION_USER_ID)

    const message = await submitAgainst({
      code: '23503',
      message:
        'insert or update on table "positions" violates foreign key constraint "positions_ticker_fkey"',
      details: 'Key (ticker)=(PETR4) is not present in table "assets".',
      hint: null,
    })

    expect(message).toBe('O ativo PETR4 não está no catálogo.')
  })

  it('23503 na FK de user_id não culpa o ticker', async () => {
    signIn(SESSION_USER_ID)

    const message = await submitAgainst({
      code: '23503',
      message:
        'insert or update on table "positions" violates foreign key constraint "positions_user_id_fkey"',
      details: `Key (user_id)=(${SESSION_USER_ID}) is not present in table "users".`,
      hint: null,
    })

    expect(message).toContain('conta')
    expect(message).not.toContain('catálogo')
    expect(message).not.toContain('PETR4')
    expect(message).not.toContain('positions_user_id_fkey')
  })

  it('23503 sem constraint identificável não atribui culpa a campo algum', async () => {
    signIn(SESSION_USER_ID)

    const message = await submitAgainst({
      code: '23503',
      message: 'foreign key violation',
      details: null,
      hint: null,
    })

    expect(message).not.toContain('catálogo')
    expect(message).not.toContain('conta')
    expect(message).toContain('não corresponde a um registro existente')
  })

  // O guard de sessão do `useAddPosition` monta um erro próprio; sem um código
  // no formato que o mapeamento lê, ele caía no texto genérico e a explicação
  // real nunca chegava à tela.
  it('sessão ausente diz para entrar novamente', async () => {
    // Nenhum `signIn`: a sessão não existe no momento do submit.
    catalogReturns(CATALOG_ASSET)
    supabaseMock.on('positions', () => ({ data: null, error: null }))

    const { onSuccess } = renderForm(createQueryClient())
    await fillAndSubmit('PETR4')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Sessão expirada. Entre novamente para cadastrar posições.')
    expect(onSuccess).not.toHaveBeenCalled()
    expect(supabaseMock.chainsWith('positions', 'insert')).toHaveLength(0)
  })

  it('erro sem código algum cai na mensagem genérica', async () => {
    signIn(SESSION_USER_ID)

    const message = await submitAgainst(new Error('rede caiu'))

    expect(message).toBe('Não foi possível salvar a posição. Tente novamente.')
    expect(message).not.toContain('rede caiu')
  })
})

describe('AddPositionForm — combobox de sugestões', () => {
  const PETR3 = { ticker: 'PETR3', name: 'Petrobras ON', type: 'stock_br', currency: 'BRL' }
  const PETR4 = { ticker: 'PETR4', name: 'Petrobras PN', type: 'stock_br', currency: 'BRL' }
  const PETRZ = { ticker: 'PETRZ', name: 'Petro Z', type: 'stock_br', currency: 'BRL' }

  /**
   * Cliente com o catálogo já em cache: a lista encolhe no mesmo render em que
   * o termo debounceado muda, sem passar por um estado vazio intermediário. É a
   * sequência real — resposta em cache do termo mais longo — e a que expõe o
   * índice defasado.
   */
  function clientWithCachedSuggestions() {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
        mutations: { retry: false },
      },
    })

    queryClient.setQueryData(['portfolio', 'assets', 'PETR'], [PETR3, PETR4, PETRZ])
    queryClient.setQueryData(['portfolio', 'assets', 'PETRO'], [PETR3])

    return queryClient
  }

  it('reclampa o realce quando a lista debounceada encolhe', async () => {
    signIn(SESSION_USER_ID)
    catalogReturns(null)

    renderForm(clientWithCachedSuggestions())
    const input = screen.getByLabelText('Ativo')

    fireEvent.change(input, { target: { value: 'PETR' } })
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(3))

    // Digitar zera o realce; as setas vêm depois e sobrevivem ao debounce.
    fireEvent.change(input, { target: { value: 'PETRO' } })
    expect(screen.getAllByRole('option')).toHaveLength(3)

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(screen.getAllByRole('option')[2]).toHaveAttribute('aria-selected', 'true')

    // Debounce vence e a lista encolhe para um item, com o realce em 2.
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1))

    fireEvent.keyDown(input, { key: 'Enter' })

    // Sem reclampar, `suggestions[2]` é `undefined` e o Enter derruba a tela.
    expect(input).toHaveValue('PETR3')
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })

  /**
   * O reclamp acima roda num `useEffect`, isto é, *depois* do commit. Existe
   * portanto uma janela real em que a lista já encolheu na tela e o índice
   * realçado ainda aponta para fora dela — e um Enter entregue nessa janela lê o
   * índice defasado. No navegador a janela é o intervalo entre o commit e a
   * tarefa em que o React roda os passive effects: o keydown é evento discreto e
   * é despachado antes dela.
   *
   * `flushSync` reproduz exatamente isso: força render e commit do encolhimento
   * e deixa os passive effects pendentes. Sem timers falsos não há como colocar
   * o debounce dentro do `flushSync`, e sem `flushSync` o `act` do `fireEvent`
   * drena os passive effects antes do Enter — a janela se fecha e o guard nunca
   * é alcançado.
   */
  describe('Enter na janela em que o índice está defasado', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('não derruba a tela quando o realce aponta fora da lista já encolhida', async () => {
      signIn(SESSION_USER_ID)
      catalogReturns(null)

      renderForm(clientWithCachedSuggestions())
      const input = screen.getByLabelText('Ativo')

      fireEvent.change(input, { target: { value: 'PETR' } })
      act(() => {
        vi.advanceTimersByTime(300)
      })
      expect(screen.getAllByRole('option')).toHaveLength(3)

      // Termo mais longo digitado; a lista longa continua na tela até o debounce.
      fireEvent.change(input, { target: { value: 'PETRO' } })
      fireEvent.keyDown(input, { key: 'ArrowDown' })
      fireEvent.keyDown(input, { key: 'ArrowDown' })
      fireEvent.keyDown(input, { key: 'ArrowDown' })
      expect(input).toHaveAttribute('aria-activedescendant', 'ticker-option-2')

      // Commit do encolhimento, sem os passive effects: é a janela.
      flushSync(() => {
        vi.advanceTimersByTime(300)
      })

      // Um item na tela, realce ainda no índice 2 — o estado que o guard cobre.
      expect(screen.getAllByRole('option')).toHaveLength(1)
      expect(input).toHaveAttribute('aria-activedescendant', 'ticker-option-2')

      // O jsdom não propaga a exceção de um listener para fora do `dispatchEvent`
      // — ela é reportada como erro global. Sem capturá-la, remover o guard
      // deixaria este teste verde.
      const thrown: unknown[] = []
      const onError = (event: ErrorEvent) => {
        thrown.push(event.error ?? event.message)
        event.preventDefault()
      }
      window.addEventListener('error', onError)
      try {
        fireEvent.keyDown(input, { key: 'Enter' })
      } finally {
        window.removeEventListener('error', onError)
      }

      // Sem o guard: `suggestions[2].ticker` em `undefined`.
      expect(thrown).toEqual([])
      // Enter no índice defasado não escolhe nada: nada de meio-selecionado.
      expect(input).toHaveValue('PETRO')
      expect(screen.getAllByRole('option')).toHaveLength(1)

      // Fechada a janela, o mesmo Enter escolhe o item certo — a lista continua
      // viva, o guard não deixou o combobox travado.
      // Fecha a janela: os passive effects deste commit ficaram na fila do
      // Scheduler do React (MessageChannel), que não é timer e não é drenada
      // nem por `act` nem por timers falsos — só devolvendo o controle ao event
      // loop. Daí o retorno aos timers reais aqui.
      vi.useRealTimers()
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })
      expect(input).toHaveAttribute('aria-activedescendant', 'ticker-option-0')

      fireEvent.keyDown(input, { key: 'Enter' })
      expect(input).toHaveValue('PETR3')
      expect(screen.queryAllByRole('option')).toHaveLength(0)
    })
  })

  it('Escape sobre a lista fecha só a lista e mantém o modal aberto', async () => {
    signIn(SESSION_USER_ID)
    catalogReturns(null)

    const onClose = vi.fn()
    const queryClient = clientWithCachedSuggestions()

    render(
      <QueryClientProvider client={queryClient}>
        <Modal isOpen title="Adicionar posição" onClose={onClose}>
          <AddPositionForm onSuccess={vi.fn()} onCancel={vi.fn()} />
        </Modal>
      </QueryClientProvider>,
    )

    const input = screen.getByLabelText('Ativo')
    fireEvent.change(input, { target: { value: 'PETR' } })
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(3))

    fireEvent.keyDown(input, { key: 'Escape' })

    // A lista fecha, o modal não: sem `stopPropagation`, o Escape sobe até o
    // diálogo e o usuário perde o que digitou por querer só fechar a lista.
    expect(screen.queryAllByRole('option')).toHaveLength(0)
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(input).toHaveValue('PETR')

    // Com a lista já fechada, o Escape passa a ser do modal — o que prova que a
    // asserção acima não passa por o Escape nunca chegar ao diálogo.
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
