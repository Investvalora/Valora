import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'

vi.mock('../../../shared/services/supabaseClient', async () => {
  const { supabaseMock } = await import('../../../test/supabaseMock')
  return { supabase: supabaseMock.client }
})

import { resetSupabaseMock, supabaseMock } from '../../../test/supabaseMock'
import { useAuthStore } from '../../auth/store'
import { CarteiraPage } from './CarteiraPage'

const SESSION_USER_ID = '11111111-1111-4111-8111-111111111111'

const CATALOG_ASSET = {
  ticker: 'PETR4',
  name: 'Petrobras PN',
  type: 'stock_br',
  currency: 'BRL',
}

const CREATED_ROW = {
  id: 'pos-1',
  user_id: SESSION_USER_ID,
  ticker: 'PETR4',
  quantity: 100,
  average_price: 32.1,
  acquisition_date: '2026-01-15',
  created_at: '2026-01-15T00:00:00Z',
  updated_at: '2026-01-15T00:00:00Z',
  asset: CATALOG_ASSET,
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

function renderPage(queryClient = createQueryClient()) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  return render(<CarteiraPage />, { wrapper })
}

/** Catálogo respondendo ao lookup exato e ao autocomplete. */
function catalogResponds() {
  supabaseMock.on('assets', (chain) => {
    const isExactLookup = chain.calls.some((call) => call.method === 'maybeSingle')
    return isExactLookup
      ? { data: CATALOG_ASSET, error: null }
      : { data: [CATALOG_ASSET], error: null }
  })
}

/** Preenche o formulário do modal já aberto. */
function fillModalForm() {
  fireEvent.change(screen.getByLabelText('Ativo'), { target: { value: 'PETR4' } })
  fireEvent.change(screen.getByLabelText('Quantidade'), { target: { value: '100' } })
  fireEvent.change(screen.getByLabelText('Preço médio'), { target: { value: '32,10' } })
  fireEvent.change(screen.getByLabelText('Data de aquisição'), {
    target: { value: '2026-01-15' },
  })
}

beforeEach(() => {
  resetSupabaseMock()
  useAuthStore.setState({
    user: { id: SESSION_USER_ID } as User,
    session: { user: { id: SESSION_USER_ID } } as Session,
    loading: false,
  })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('CarteiraPage — cadastro válido (linha da matriz)', () => {
  it('fecha o modal e revalida a tabela sem recarregar a página', async () => {
    // O catálogo responde ao lookup exato e ao autocomplete.
    supabaseMock.on('assets', (chain) => {
      const isExactLookup = chain.calls.some((call) => call.method === 'maybeSingle')
      return isExactLookup
        ? { data: CATALOG_ASSET, error: null }
        : { data: [CATALOG_ASSET], error: null }
    })

    // A listagem só passa a devolver a posição depois do INSERT: é o que
    // distingue "a tabela revalidou" de "a tabela já vinha preenchida".
    let storedRows: unknown[] = []
    supabaseMock.on('positions', (chain) => {
      if (chain.calls.some((call) => call.method === 'insert')) {
        storedRows = [CREATED_ROW]
        return { data: CREATED_ROW, error: null }
      }
      return { data: storedRows, error: null }
    })

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={createQueryClient()}>{children}</QueryClientProvider>
    )
    render(<CarteiraPage />, { wrapper })

    expect(await screen.findByText('Nenhuma posição cadastrada')).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '+ adicionar posição' }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeInTheDocument()

    await user.type(screen.getByLabelText('Ativo'), 'PETR4')
    await user.type(screen.getByLabelText('Quantidade'), '100')
    await user.type(screen.getByLabelText('Preço médio'), '32,10')
    fireEvent.change(screen.getByLabelText('Data de aquisição'), {
      target: { value: '2026-01-15' },
    })
    await user.click(screen.getByRole('button', { name: 'Adicionar posição' }))

    // Modal fecha.
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    // Tabela revalida: a linha aparece sem remontar a página.
    const row = await screen.findByRole('row', { name: /PETR4/ })
    expect(row).toHaveTextContent('Petrobras PN')
    expect(row).toHaveTextContent('15/01/2026')
    expect(screen.queryByText('Nenhuma posição cadastrada')).toBeNull()

    expect(await screen.findByRole('status')).toHaveTextContent('Posição em PETR4 cadastrada.')

    // A leitura sempre filtra pelo usuário da sessão.
    expect(supabaseMock.callArgs('positions', 'eq')).toContainEqual(['user_id', SESSION_USER_ID])
  })
})

describe('CarteiraPage — modal não fecha com escrita em voo', () => {
  /**
   * Fechar o modal no meio do INSERT desmonta o formulário, e com ele os
   * callbacks por chamada da mutation: o aviso de sucesso desaparece e, no
   * caminho de erro, o usuário não recebe aviso algum — o cadastro falha em
   * silêncio absoluto. Enquanto a escrita está em voo, nada fecha.
   */
  function insertHeldOpen() {
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })

    supabaseMock.on('positions', (chain) => {
      if (chain.calls.some((call) => call.method === 'insert')) {
        return gate.then(() => ({
          data: CREATED_ROW,
          error: null,
        })) as unknown as { data: unknown; error: unknown }
      }
      return { data: [], error: null }
    })

    return () => release()
  }

  async function openAndSubmit() {
    catalogResponds()
    const release = insertHeldOpen()

    renderPage()
    await screen.findByText('Nenhuma posição cadastrada')

    fireEvent.click(screen.getByRole('button', { name: '+ adicionar posição' }))
    await screen.findByRole('dialog')

    fillModalForm()
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar posição' }))

    await waitFor(() => expect(supabaseMock.chainsWith('positions', 'insert')).toHaveLength(1))

    return release
  }

  it('Escape não fecha enquanto salva', async () => {
    const release = await openAndSubmit()

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    expect(screen.getByRole('dialog')).toBeInTheDocument()

    release()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    // Só quando a escrita conclui é que o modal fecha — e com o aviso.
    expect(await screen.findByRole('status')).toHaveTextContent('Posição em PETR4 cadastrada.')
  })

  it('clique no overlay não fecha enquanto salva', async () => {
    const release = await openAndSubmit()

    const overlay = screen.getByRole('dialog').parentElement as HTMLElement
    fireEvent.mouseDown(overlay)

    expect(screen.getByRole('dialog')).toBeInTheDocument()

    release()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('os botões de fechar e cancelar ficam desabilitados enquanto salva', async () => {
    const release = await openAndSubmit()

    expect(screen.getByRole('button', { name: 'Fechar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    release()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('volta a fechar normalmente depois que a escrita conclui', async () => {
    catalogResponds()
    supabaseMock.on('positions', () => ({ data: [], error: null }))

    renderPage()
    await screen.findByText('Nenhuma posição cadastrada')

    fireEvent.click(screen.getByRole('button', { name: '+ adicionar posição' }))
    await screen.findByRole('dialog')

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})

describe('CarteiraPage — sessão ainda carregando', () => {
  /**
   * Sem `userId` a query fica desabilitada, `isLoading` é falso e a página
   * concluía "0 posições cadastradas" com o estado vazio antes de qualquer
   * consulta. É afirmar carteira vazia sem ter olhado.
   */
  it('mostra carregamento em vez de afirmar carteira vazia', () => {
    useAuthStore.setState({ user: null, session: null, loading: true })
    supabaseMock.on('positions', () => ({ data: [], error: null }))

    renderPage()

    expect(screen.getByText('Carregando...')).toBeInTheDocument()
    expect(screen.getByText('Carregando posições...')).toBeInTheDocument()
    expect(screen.queryByText('Nenhuma posição cadastrada')).toBeNull()
    expect(screen.queryByText('0 posições cadastradas')).toBeNull()
    // E nada foi consultado: a afirmação anterior não tinha base nenhuma.
    expect(supabaseMock.chains).toHaveLength(0)
  })

  it('mostra o estado vazio depois que a sessão resolve e a consulta volta vazia', async () => {
    supabaseMock.on('positions', () => ({ data: [], error: null }))

    renderPage()

    expect(await screen.findByText('Nenhuma posição cadastrada')).toBeInTheDocument()
    expect(screen.getByText('0 posições cadastradas')).toBeInTheDocument()
  })
})

describe('CarteiraPage — falha de revalidação', () => {
  /**
   * Uma revalidação perdida não apaga a lista já carregada: esconder linhas que
   * o usuário está lendo por causa de um refetch com erro é regressão de
   * informação, e ainda faria o cabeçalho anunciar "0 posições".
   */
  it('mantém as linhas em cache e acrescenta o banner de erro', async () => {
    let shouldFail = false
    supabaseMock.on('positions', () =>
      shouldFail
        ? { data: null, error: { code: '08006', message: 'connection failure', details: null, hint: null } }
        : { data: [CREATED_ROW], error: null },
    )

    const queryClient = createQueryClient()
    renderPage(queryClient)

    const row = await screen.findByRole('row', { name: /PETR4/ })
    expect(row).toBeInTheDocument()

    shouldFail = true
    await queryClient.refetchQueries({ queryKey: ['portfolio', 'positions', SESSION_USER_ID] })

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Não foi possível atualizar suas posições')

    // A linha continua na tela.
    expect(screen.getByRole('row', { name: /PETR4/ })).toBeInTheDocument()
    expect(screen.getByText('1 posição cadastrada')).toBeInTheDocument()
    expect(screen.queryByText('Nenhuma posição cadastrada')).toBeNull()
  })

  it('sem cache algum, não afirma carteira vazia', async () => {
    supabaseMock.on('positions', () => ({
      data: null,
      error: { code: '08006', message: 'connection failure', details: null, hint: null },
    }))

    renderPage()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Não foi possível carregar suas posições.')

    // Nem tabela nem estado vazio: ninguém conseguiu olhar a carteira.
    expect(screen.queryByText('Nenhuma posição cadastrada')).toBeNull()
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.queryByText('0 posições cadastradas')).toBeNull()
    expect(screen.getByText('Não foi possível carregar as posições.')).toBeInTheDocument()
  })
})
