import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
