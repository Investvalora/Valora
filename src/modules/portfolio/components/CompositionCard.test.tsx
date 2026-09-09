import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { derivePositionRows } from '../positionRows'
import type { AssetType, LatestQuote, PositionWithAsset } from '../types'
import { CompositionCard } from './CompositionCard'

/**
 * O gráfico é substituído por dublê: em jsdom o `ResponsiveContainer` mede 0×0 e
 * a pizza não desenha, então asserção sobre `path` do SVG provaria nada. O que
 * precisa ser verificado é a legenda textual — é ela que carrega a informação
 * para leitor de tela. O dublê também é o que permite simular a falha do chunk.
 *
 * O gráfico real é montado nos testes da `CarteiraPage`, onde o card aparece
 * integrado à tela.
 */
const chartState = vi.hoisted(() => ({ shouldFail: false }))

vi.mock('./CompositionPieChart', () => ({
  default: () => {
    if (chartState.shouldFail) {
      throw new Error('Failed to fetch dynamically imported module')
    }

    return <div data-testid="composition-pie-chart" />
  },
}))

const TODAY = '2026-02-10'

function position(
  ticker: string,
  type: AssetType | null,
  quantity: number,
  currency: 'BRL' | 'USD' = 'BRL',
): PositionWithAsset {
  return {
    id: `pos-${ticker}`,
    user_id: '11111111-1111-4111-8111-111111111111',
    ticker,
    quantity,
    average_price: 10,
    acquisition_date: '2026-01-15',
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
    asset: type === null ? null : { ticker, name: `${ticker} SA`, type, currency },
  } as PositionWithAsset
}

function quote(ticker: string, close: number): LatestQuote {
  return {
    ticker,
    close,
    source: 'b3_cotahist',
    date: TODAY,
    updated_at: '2026-02-10T21:30:00Z',
  }
}

/**
 * O card recebe o que a `CarteiraPage` já derivou, então os testes passam pela
 * derivação real: fabricar `PositionRow` à mão testaria o fixture.
 */
function renderCard({
  positions = [position('PETR4', 'stock_br', 100), position('AAPL34', 'bdr', 20)],
  quotes = [quote('PETR4', 20), quote('AAPL34', 50)],
  usdRate = 5 as number | null,
  isQuotesLoading = false,
}: {
  positions?: PositionWithAsset[]
  quotes?: LatestQuote[]
  usdRate?: number | null
  isQuotesLoading?: boolean
} = {}) {
  const derived = derivePositionRows({ positions, quotes, usdRate, today: TODAY })

  const result = render(
    <CompositionCard
      rows={derived.rows}
      totalBRL={derived.totalBRL}
      isQuotesLoading={isQuotesLoading}
      missingValueCount={derived.missingValueCount}
    />,
  )

  return { ...result, derived }
}

/** `<section>` com nome acessível expõe `role="region"`. */
function compositionCard(): HTMLElement {
  return screen.getByRole('region', { name: 'Composição por classe' })
}

function legend(): HTMLElement {
  return screen.getByRole('list', { name: 'Classes de ativo da carteira' })
}

/**
 * Itens da legenda como elementos, não como texto cru: `Intl.NumberFormat`
 * separa "R$" do número com espaço não separável (U+00A0), e comparar
 * `textContent` contra um literal com espaço comum falha por um caractere
 * invisível. `toHaveTextContent` normaliza o espaço em branco.
 */
function legendItems(): HTMLElement[] {
  return within(legend()).getAllByRole('listitem')
}

describe('CompositionCard — legenda acessível', () => {
  it('lista cada classe com valor em R$ e percentual', async () => {
    renderCard()

    // PETR4: 100 × 20 = 2.000 (66,67%); AAPL34: 20 × 50 = 1.000 (33,33%).
    const entries = legendItems()

    expect(entries).toHaveLength(2)
    expect(entries[0]).toHaveTextContent('Ações BR')
    expect(entries[0]).toHaveTextContent('R$ 2.000,00')
    expect(entries[0]).toHaveTextContent('66,67%')
    expect(entries[1]).toHaveTextContent('BDRs')
    expect(entries[1]).toHaveTextContent('R$ 1.000,00')
    expect(entries[1]).toHaveTextContent('33,33%')

    // O gráfico é enriquecimento e chega depois — a legenda não espera por ele.
    expect(await screen.findByTestId('composition-pie-chart')).toBeInTheDocument()
  })

  it('mostra o ticker principal de cada classe sem depender do SVG', () => {
    renderCard({
      positions: [
        position('XPML11', 'fii', 100),
        position('HGLG11', 'fii', 10),
      ],
      quotes: [quote('XPML11', 1), quote('HGLG11', 100)],
    })

    expect(legendItems()[0]).toHaveTextContent('Maior posição: HGLG11')
  })

  it('não lista classe sem posição', () => {
    renderCard()

    const card = compositionCard()
    expect(within(card).queryByText(/REITs/)).toBeNull()
    expect(within(card).queryByText(/Cryptos/)).toBeNull()
    expect(within(card).queryByText(/Stocks US/)).toBeNull()
  })

  it('o gráfico fica fora da árvore de acessibilidade', async () => {
    renderCard()

    const chart = await screen.findByTestId('composition-pie-chart')
    expect(chart.closest('[aria-hidden="true"]')).not.toBeNull()
  })
})

describe('CompositionCard — total e exposição internacional', () => {
  it('mostra o total avaliado em destaque e a exposição internacional', () => {
    renderCard()

    const card = compositionCard()
    // Total 3.000; internacional = BDR 1.000 → 33,33%.
    expect(within(card).getByText('R$ 3.000,00')).toBeInTheDocument()
    expect(card).toHaveTextContent('Exposição internacional: 33,33% (R$ 1.000,00)')
  })

  it('carteira só em ativos BR mostra 0% de exposição', () => {
    renderCard({
      positions: [position('PETR4', 'stock_br', 100), position('HGLG11', 'fii', 10)],
      quotes: [quote('PETR4', 20), quote('HGLG11', 100)],
    })

    expect(compositionCard()).toHaveTextContent('Exposição internacional: 0,00%')
  })

  it('carteira só em ativos estrangeiros mostra 100% de exposição', () => {
    renderCard({
      positions: [position('AAPL', 'stock_us', 10, 'USD'), position('BTC', 'crypto', 1, 'USD')],
      quotes: [quote('AAPL', 100), quote('BTC', 200)],
    })

    expect(compositionCard()).toHaveTextContent('Exposição internacional: 100,00%')
  })
})

describe('CompositionCard — lacuna honesta', () => {
  /**
   * Pizza vazia afirmando "0%" seria pior do que não mostrar nada: o usuário
   * leria diversificação zero onde o que falta é cotação.
   */
  it('sem nenhuma posição avaliada, mostra lacuna e não desenha pizza', () => {
    renderCard({ quotes: [] })

    const card = compositionCard()
    expect(within(card).getByText('—')).toBeInTheDocument()
    expect(card).toHaveTextContent('Nenhuma posição com cotação disponível para calcular a composição.')
    expect(card).not.toHaveTextContent('0,00%')
    expect(screen.queryByRole('list', { name: 'Classes de ativo da carteira' })).toBeNull()
    expect(screen.queryByTestId('composition-pie-chart')).toBeNull()
  })

  it('declara as posições que ficaram fora da composição', () => {
    renderCard({
      positions: [position('PETR4', 'stock_br', 100), position('VALE3', 'stock_br', 50)],
      quotes: [quote('PETR4', 20)],
    })

    expect(compositionCard()).toHaveTextContent(
      '1 posição sem cotação disponível não entra na composição.',
    )
  })

  it('a contagem de excluídas é a que o pai calculou, no plural', () => {
    renderCard({
      positions: [
        position('PETR4', 'stock_br', 100),
        position('VALE3', 'stock_br', 50),
        position('AAPL', 'stock_us', 10, 'USD'),
      ],
      quotes: [quote('PETR4', 20)],
    })

    expect(compositionCard()).toHaveTextContent(
      '2 posições sem cotação disponível não entram na composição.',
    )
  })

  it('carteira sem posições não renderiza o card', () => {
    renderCard({ positions: [], quotes: [] })

    expect(screen.queryByRole('region', { name: 'Composição por classe' })).toBeNull()
  })
})

describe('CompositionCard — carregamento não é ausência', () => {
  /**
   * `totalBRL === 0` acontece em dois estados: as cotações ainda não chegaram, ou
   * chegaram e nenhuma serve. Afirmar "nenhuma posição com cotação" no primeiro
   * pisca uma acusação falsa em todo carregamento de página com posições — e
   * contradiz o card de patrimônio ao lado, que suprime a mesma frase.
   */
  it('em voo, mostra carregamento em vez de afirmar ausência de cotação', () => {
    renderCard({ quotes: [], isQuotesLoading: true })

    const card = compositionCard()
    expect(card).toHaveTextContent('Carregando composição...')
    expect(card).not.toHaveTextContent('Nenhuma posição com cotação disponível')
  })

  it('em voo, não acusa posições sem cotação', () => {
    renderCard({
      positions: [position('PETR4', 'stock_br', 100), position('VALE3', 'stock_br', 50)],
      quotes: [quote('PETR4', 20)],
      isQuotesLoading: true,
    })

    expect(compositionCard()).not.toHaveTextContent('não entra na composição')
  })

  /** Taxa USD em voo é o mesmo estado: a posição em dólar ainda não tem valor. */
  it('sem taxa USD ainda, não afirma ausência de cotação', () => {
    renderCard({
      positions: [position('AAPL', 'stock_us', 10, 'USD')],
      quotes: [quote('AAPL', 100)],
      usdRate: null,
      isQuotesLoading: true,
    })

    expect(compositionCard()).toHaveTextContent('Carregando composição...')
  })

  it('quando as cotações chegam e nenhuma serve, aí sim afirma a ausência', () => {
    renderCard({ quotes: [], isQuotesLoading: false })

    expect(compositionCard()).toHaveTextContent(
      'Nenhuma posição com cotação disponível para calcular a composição.',
    )
    expect(compositionCard()).not.toHaveTextContent('Carregando composição...')
  })
})

describe('CompositionCard — gráfico indisponível', () => {
  /**
   * O chunk do Recharts pode não baixar (deploy novo, rede ruim). Sem fronteira
   * de erro, isso derruba a Carteira inteira e leva embora números que estavam
   * calculados e corretos.
   */
  it('degrada para a legenda quando o gráfico falha', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    chartState.shouldFail = true

    try {
      renderCard()

      // A fronteira derruba só o gráfico.
      await vi.waitFor(() => expect(consoleWarn).toHaveBeenCalled())
      expect(screen.queryByTestId('composition-pie-chart')).toBeNull()

      // E a informação continua toda de pé.
      const card = compositionCard()
      expect(within(card).getByText('R$ 3.000,00')).toBeInTheDocument()
      expect(card).toHaveTextContent('Exposição internacional: 33,33%')

      const entries = legendItems()
      expect(entries[0]).toHaveTextContent('Ações BR')
      expect(entries[0]).toHaveTextContent('R$ 2.000,00')
      expect(entries[1]).toHaveTextContent('BDRs')
    } finally {
      chartState.shouldFail = false
      consoleWarn.mockRestore()
      consoleError.mockRestore()
    }
  })
})
