import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

/** Hoje, no fuso do runner: a flag de cotação antiga é relativa ao dia local. */
function todayIso(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function quoteRow(overrides: Record<string, unknown> = {}) {
  return {
    ticker: 'PETR4',
    date: todayIso(),
    close: 34.5,
    source: 'b3_cotahist',
    updated_at: '2026-02-10T21:30:00Z',
    ...overrides,
  }
}

/**
 * `fetch` da cadeia USD/BRL substituído por dublê. `rate` nulo derruba todas as
 * fontes, que é o cenário do badge "taxa USD aproximada".
 */
function stubUSDSources({ rate }: { rate: number | null }) {
  const fetchMock = vi.fn(async () => {
    if (rate === null) throw new TypeError('Failed to fetch')

    return {
      ok: true,
      status: 200,
      json: async () => ({
        value: [{ cotacaoVenda: rate, dataHoraCotacao: '2026-09-04 13:08:47.123' }],
      }),
    } as unknown as Response
  })

  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(() => {
  resetSupabaseMock()
  useAuthStore.setState({
    user: { id: SESSION_USER_ID } as User,
    session: { user: { id: SESSION_USER_ID } } as Session,
    loading: false,
  })
  vi.spyOn(console, 'error').mockImplementation(() => {})
  // A cadeia de AD-12 é rede de verdade: sem o dublê, um teste de carteira
  // dispararia requisição ao Banco Central.
  window.localStorage.clear()
  stubUSDSources({ rate: 5.12 })
})

afterEach(() => {
  vi.unstubAllGlobals()
  window.localStorage.clear()
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

const VALE_ROW = {
  id: 'pos-vale',
  user_id: SESSION_USER_ID,
  ticker: 'VALE3',
  quantity: 50,
  average_price: 60,
  acquisition_date: '2026-01-20',
  created_at: '2026-01-20T00:00:00Z',
  updated_at: '2026-01-20T00:00:00Z',
  asset: { ticker: 'VALE3', name: 'Vale ON', type: 'stock_br', currency: 'BRL' },
}

const USD_ROW = {
  id: 'pos-aapl',
  user_id: SESSION_USER_ID,
  ticker: 'AAPL',
  quantity: 10,
  average_price: 120,
  acquisition_date: '2026-01-20',
  created_at: '2026-01-20T00:00:00Z',
  updated_at: '2026-01-20T00:00:00Z',
  asset: { ticker: 'AAPL', name: 'Apple Inc', type: 'stock_us', currency: 'USD' },
}

/** Card de patrimônio: `<section>` com nome acessível expõe `role="region"`. */
function patrimonyCard(): HTMLElement {
  return screen.getByRole('region', { name: 'Patrimônio total' })
}

describe('CarteiraPage — valor de mercado, peso e patrimônio', () => {
  it('deriva cotação, valor de mercado, peso e variação na linha, e o total no card', async () => {
    supabaseMock.on('positions', () => ({ data: [CREATED_ROW], error: null }))
    supabaseMock.on('price_history', () => ({ data: [quoteRow()], error: null }))

    renderPage()

    const row = await screen.findByRole('row', { name: /PETR4/ })
    await waitFor(() => expect(row).toHaveTextContent('3.450,00'))

    // 100 × 34,50 = 3.450,00; peso 100% da carteira; (34,50−32,10)/32,10.
    expect(row).toHaveTextContent('34,50')
    expect(row).toHaveTextContent('100,00%')
    expect(row).toHaveTextContent('+7,48%')
    expect(within(patrimonyCard()).getByText('R$ 3.450,00')).toBeInTheDocument()
  })

  it('consulta cotação só dos tickers da carteira', async () => {
    supabaseMock.on('positions', () => ({ data: [CREATED_ROW, VALE_ROW], error: null }))
    supabaseMock.on('price_history', () => ({ data: [quoteRow()], error: null }))

    renderPage()
    await screen.findByRole('row', { name: /PETR4/ })

    await waitFor(() =>
      expect(supabaseMock.callArgs('price_history', 'in')).toEqual([
        ['ticker', ['PETR4', 'VALE3']],
      ]),
    )
  })

  /**
   * Somar só o que tem cotação e não dizer nada transformaria o patrimônio num
   * número subestimado com cara de exato.
   */
  it('declara as posições que ficaram fora do total por falta de cotação', async () => {
    supabaseMock.on('positions', () => ({ data: [CREATED_ROW, VALE_ROW], error: null }))
    supabaseMock.on('price_history', () => ({ data: [quoteRow()], error: null }))

    renderPage()
    await screen.findByRole('row', { name: /VALE3/ })

    const card = patrimonyCard()
    await waitFor(() =>
      expect(card).toHaveTextContent('1 posição sem cotação disponível não entra no total.'),
    )
    expect(within(card).getByText('R$ 3.450,00')).toBeInTheDocument()

    // A posição sem cotação continua listada, com lacuna em vez de zero.
    const valeRow = screen.getByRole('row', { name: /VALE3/ })
    expect(valeRow).toHaveTextContent('—')
    expect(valeRow).not.toHaveTextContent('R$ 0,00')
  })

  it('sem nenhuma cotação, o total é lacuna e não R$ 0,00', async () => {
    supabaseMock.on('positions', () => ({ data: [CREATED_ROW], error: null }))
    supabaseMock.on('price_history', () => ({ data: [], error: null }))

    renderPage()
    await screen.findByRole('row', { name: /PETR4/ })

    await waitFor(() => expect(patrimonyCard()).not.toHaveTextContent('R$ 0,00'))
    expect(patrimonyCard()).toHaveTextContent('—')
  })
})

describe('CarteiraPage — conversão USD', () => {
  it('converte a posição em dólar pela taxa do PTAX, sem badge de aproximação', async () => {
    supabaseMock.on('positions', () => ({ data: [USD_ROW], error: null }))
    supabaseMock.on('price_history', () => ({
      data: [quoteRow({ ticker: 'AAPL', close: 150, source: 'twelvedata' })],
      error: null,
    }))

    renderPage()
    const row = await screen.findByRole('row', { name: /AAPL/ })

    // 10 × US$ 150 × 5,12 = R$ 7.680,00.
    await waitFor(() => expect(row).toHaveTextContent('7.680,00'))
    expect(patrimonyCard()).toHaveTextContent('R$ 5,1200')
    expect(screen.queryByText('taxa USD aproximada')).toBeNull()
  })

  it('com PTAX e AwesomeAPI fora, usa o fallback e avisa que a taxa é aproximada', async () => {
    stubUSDSources({ rate: null })
    supabaseMock.on('positions', () => ({ data: [USD_ROW], error: null }))
    supabaseMock.on('price_history', () => ({
      data: [quoteRow({ ticker: 'AAPL', close: 150 })],
      error: null,
    }))

    renderPage()
    const row = await screen.findByRole('row', { name: /AAPL/ })

    // Fallback fixo de R$ 5,00: 10 × 150 × 5.
    await waitFor(() => expect(row).toHaveTextContent('7.500,00'))
    expect(await screen.findByText('taxa USD aproximada')).toBeInTheDocument()
  })

  it('carteira só em reais não vai buscar taxa de câmbio', async () => {
    const fetchMock = stubUSDSources({ rate: 5.12 })
    supabaseMock.on('positions', () => ({ data: [CREATED_ROW], error: null }))
    supabaseMock.on('price_history', () => ({ data: [quoteRow()], error: null }))

    renderPage()
    await screen.findByRole('row', { name: /PETR4/ })
    await waitFor(() => expect(patrimonyCard()).toHaveTextContent('R$ 3.450,00'))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(patrimonyCard()).not.toHaveTextContent('Dólar usado na conversão')
  })
})

describe('CarteiraPage — falha ao buscar cotações', () => {
  /**
   * Cotação e posições são queries separadas justamente para isto: a lista não
   * depende da cotação para existir, e uma falha de cotação não pode esvaziar a
   * carteira nem afirmar "0 posições".
   */
  it('mantém a lista, avisa e degrada só as colunas derivadas', async () => {
    supabaseMock.on('positions', () => ({ data: [CREATED_ROW], error: null }))
    supabaseMock.on('price_history', () => ({
      data: null,
      error: { code: '08006', message: 'connection failure', details: null, hint: null },
    }))

    renderPage()

    // A ordem importa: a asserção sobre a lista tem de acontecer *depois* de o
    // erro estar na tela. Guardar a linha antes e reusar a referência passaria
    // mesmo com a tabela desmontada — o nó destacado conserva o texto.
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Não foi possível carregar as cotações')

    const row = screen.getByRole('row', { name: /PETR4/ })
    expect(row).toHaveTextContent('Petrobras PN')
    expect(row).toHaveTextContent('32,10')

    expect(screen.getByText('1 posição cadastrada')).toBeInTheDocument()
    expect(screen.queryByText('Nenhuma posição cadastrada')).toBeNull()
    expect(row).toHaveTextContent('—')
    expect(row).not.toHaveTextContent('R$ 0,00')
  })
})

describe('CarteiraPage — ordenação da lista', () => {
  function tickerOrder(): string[] {
    return screen.getAllByRole('rowheader').map((header) => header.textContent ?? '')
  }

  // Três posições calibradas para que peso, variação e ticker produzam TRÊS
  // permutações distintas — sem isso o teste passaria mesmo sem ordenar.
  //   PETR4: 10 × 20  = 200   | 10 → 20  = +100%
  //   VALE3: 100 × 60 = 6.000 | 50 → 60  = +20%
  //   ITUB4: 40 × 30  = 1.200 | 20 → 30  = +50%
  const SORT_POSITIONS = [
    { ...CREATED_ROW, id: 'pos-petr', ticker: 'PETR4', quantity: 10, average_price: 10 },
    {
      ...CREATED_ROW,
      id: 'pos-vale',
      ticker: 'VALE3',
      quantity: 100,
      average_price: 50,
      asset: { ticker: 'VALE3', name: 'Vale ON', type: 'stock_br', currency: 'BRL' },
    },
    {
      ...CREATED_ROW,
      id: 'pos-itub',
      ticker: 'ITUB4',
      quantity: 40,
      average_price: 20,
      asset: { ticker: 'ITUB4', name: 'Itaú PN', type: 'stock_br', currency: 'BRL' },
    },
  ]
  const SORT_QUOTES = [
    quoteRow({ ticker: 'PETR4', close: 20 }),
    quoteRow({ ticker: 'VALE3', close: 60 }),
    quoteRow({ ticker: 'ITUB4', close: 30 }),
  ]

  it('abre por peso decrescente e alterna entre variação e ticker', async () => {
    supabaseMock.on('positions', () => ({ data: SORT_POSITIONS, error: null }))
    supabaseMock.on('price_history', () => ({ data: SORT_QUOTES, error: null }))

    renderPage()
    await screen.findByRole('row', { name: /VALE3/ })

    // Peso desc: 6.000 > 1.200 > 200.
    await waitFor(() => expect(tickerOrder()).toEqual(['VALE3', 'ITUB4', 'PETR4']))
    expect(screen.getByRole('columnheader', { name: /Peso/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    )

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Variação/ }))

    // Variação desc: +100% > +50% > +20% — permutação diferente da de peso.
    expect(tickerOrder()).toEqual(['PETR4', 'ITUB4', 'VALE3'])
    expect(screen.getByRole('columnheader', { name: /Variação/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    )

    await user.click(screen.getByRole('button', { name: /Ticker/ }))

    // Ticker asc: ITUB4 < PETR4 < VALE3 — terceira permutação distinta.
    expect(tickerOrder()).toEqual(['ITUB4', 'PETR4', 'VALE3'])
    expect(screen.getByRole('columnheader', { name: /Ticker/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )
    expect(screen.getByRole('columnheader', { name: /Peso/ })).toHaveAttribute('aria-sort', 'none')
  })
})

describe('CarteiraPage — rastreabilidade na tela', () => {
  it('mostra fonte e data da cotação no tooltip da linha', async () => {
    supabaseMock.on('positions', () => ({ data: [CREATED_ROW], error: null }))
    supabaseMock.on('price_history', () => ({
      data: [quoteRow({ date: '2026-01-05', updated_at: '2026-01-05T21:30:00Z' })],
      error: null,
    }))

    renderPage()
    const trigger = await screen.findByRole('button', {
      name: 'Procedência da cotação de PETR4',
    })

    const user = userEvent.setup()
    await user.click(trigger)

    const tooltip = screen.getByRole('tooltip')
    expect(tooltip).toHaveTextContent('b3_cotahist')
    expect(tooltip).toHaveTextContent('05/01/2026')

    // Fechamento antigo é sinalizado na própria linha.
    expect(screen.getByRole('row', { name: /PETR4/ })).toHaveTextContent('Cotação antiga')
  })
})
