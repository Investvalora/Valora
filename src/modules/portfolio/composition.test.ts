import { describe, expect, it } from 'vitest'
import {
  ASSET_CLASS_COLOR,
  ASSET_CLASS_LABEL,
  ASSET_CLASS_ORDER,
  INTERNATIONAL_TYPES,
  UNKNOWN_ASSET_CLASS,
  UNKNOWN_ASSET_CLASS_COLOR,
  assetClassColor,
  assetClassLabel,
  deriveComposition,
  isInternationalClass,
} from './composition'
import { derivePositionRows } from './positionRows'
import type { AssetType, LatestQuote, PositionRow, PositionWithAsset } from './types'

const TODAY = '2026-02-10'

/**
 * As linhas passam pela derivação real da 2.3 em vez de serem fabricadas: um
 * teste que monta `PositionRow` à mão prova que a agregação soma o que o teste
 * escreveu, não o que a carteira produz.
 */
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

/** Deriva as linhas como a Carteira faz e devolve o par que o card recebe. */
function derive(positions: PositionWithAsset[], quotes: LatestQuote[], usdRate: number | null = 5) {
  return derivePositionRows({ positions, quotes, usdRate, today: TODAY })
}

function compose(positions: PositionWithAsset[], quotes: LatestQuote[], usdRate: number | null = 5) {
  const derived = derive(positions, quotes, usdRate)
  return deriveComposition(derived.rows, derived.totalBRL)
}

describe('deriveComposition — carteira diversificada', () => {
  const POSITIONS = [
    position('PETR4', 'stock_br', 100), // 100 × 20 = 2.000
    position('HGLG11', 'fii', 10), // 10 × 100 = 1.000
    position('AAPL34', 'bdr', 20), // 20 × 50 = 1.000
  ]
  const QUOTES = [quote('PETR4', 20), quote('HGLG11', 100), quote('AAPL34', 50)]

  it('produz uma fatia por classe presente, com valor e percentual em BRL', () => {
    const composition = compose(POSITIONS, QUOTES)

    expect(composition.totalBRL).toBe(4000)
    expect(composition.slices.map((slice) => slice.type)).toEqual(['stock_br', 'fii', 'bdr'])
    expect(composition.slices.map((slice) => slice.label)).toEqual(['Ações BR', 'FIIs', 'BDRs'])
    expect(composition.slices.map((slice) => slice.valueBRL)).toEqual([2000, 1000, 1000])
    expect(composition.slices.map((slice) => slice.percent)).toEqual([50, 25, 25])
  })

  it('os percentuais das classes presentes somam 100%', () => {
    const composition = compose(POSITIONS, QUOTES)
    const sum = composition.slices.reduce((total, slice) => total + slice.percent, 0)

    expect(sum).toBeCloseTo(100, 10)
  })

  it('a soma das fatias é o total do card de patrimônio', () => {
    const derived = derive(POSITIONS, QUOTES)
    const composition = deriveComposition(derived.rows, derived.totalBRL)
    const sum = composition.slices.reduce((total, slice) => total + slice.valueBRL, 0)

    expect(sum).toBeCloseTo(derived.totalBRL, 10)
  })

  it('exposição internacional é o peso do BDR', () => {
    const composition = compose(POSITIONS, QUOTES)

    expect(composition.internationalValueBRL).toBe(1000)
    expect(composition.internationalPercent).toBe(25)
  })

  it('classe sem posição não aparece', () => {
    const composition = compose(POSITIONS, QUOTES)

    expect(composition.slices.some((slice) => slice.type === 'reit')).toBe(false)
    expect(composition.slices.some((slice) => slice.type === 'crypto')).toBe(false)
    expect(composition.slices).toHaveLength(3)
  })

  it('mantém a ordem de exibição canônica, não a ordem de chegada', () => {
    // Mesmas posições, ordem invertida na resposta do banco.
    const composition = compose([...POSITIONS].reverse(), QUOTES)

    expect(composition.slices.map((slice) => slice.type)).toEqual(['stock_br', 'fii', 'bdr'])
  })
})

describe('deriveComposition — exposição internacional', () => {
  it('carteira só em ativos BR tem exposição 0%', () => {
    const composition = compose(
      [position('PETR4', 'stock_br', 100), position('HGLG11', 'fii', 10)],
      [quote('PETR4', 20), quote('HGLG11', 100)],
    )

    expect(composition.internationalPercent).toBe(0)
    expect(composition.internationalValueBRL).toBe(0)
    expect(composition.slices).toHaveLength(2)
  })

  it('carteira só em ativos estrangeiros tem exposição 100%', () => {
    const composition = compose(
      [
        position('AAPL', 'stock_us', 10, 'USD'),
        position('BTC', 'crypto', 1, 'USD'),
      ],
      [quote('AAPL', 100), quote('BTC', 200)],
    )

    // 10 × 100 × 5 + 1 × 200 × 5 = 6.000, tudo internacional.
    expect(composition.totalBRL).toBe(6000)
    expect(composition.internationalValueBRL).toBe(6000)
    expect(composition.internationalPercent).toBe(100)
  })

  /**
   * A regra é por CLASSE, não por moeda. BDR é cotado em BRL na B3: um filtro
   * por `currency === 'USD'` daria 0% de exposição para uma carteira inteira em
   * BDR. Este teste morre se alguém trocar a regra por moeda.
   */
  it('BDR cotado em BRL conta como exposição ao exterior', () => {
    const composition = compose([position('AAPL34', 'bdr', 20)], [quote('AAPL34', 50)])

    expect(composition.slices[0].type).toBe('bdr')
    expect(composition.slices[0].valueBRL).toBe(1000)
    expect(composition.internationalPercent).toBe(100)
  })

  /** E o espelho: REIT em USD também conta, então não é "só o que é BRL". */
  it('REIT em dólar conta como exposição ao exterior', () => {
    const composition = compose(
      [position('O', 'reit', 10, 'USD'), position('PETR4', 'stock_br', 100)],
      [quote('O', 50), quote('PETR4', 20)],
    )

    // REIT: 10 × 50 × 5 = 2.500; BR: 2.000. Total 4.500.
    expect(composition.internationalValueBRL).toBe(2500)
    expect(composition.internationalPercent).toBeCloseTo((2500 / 4500) * 100, 10)
  })

  it('as quatro classes internacionais são exatamente BDR, Stocks US, REITs e Cryptos', () => {
    expect([...INTERNATIONAL_TYPES]).toEqual(['bdr', 'stock_us', 'reit', 'crypto'])
    expect(isInternationalClass('stock_br')).toBe(false)
    expect(isInternationalClass('fii')).toBe(false)
    for (const type of INTERNATIONAL_TYPES) expect(isInternationalClass(type)).toBe(true)
  })
})

describe('deriveComposition — ticker principal da classe', () => {
  it('é o de maior valor de mercado, não o de maior quantidade', () => {
    const composition = compose(
      [
        // 100 cotas a R$ 1 = R$ 100 — mais cotas, menos dinheiro.
        position('XPML11', 'fii', 100),
        // 10 cotas a R$ 100 = R$ 1.000.
        position('HGLG11', 'fii', 10),
      ],
      [quote('XPML11', 1), quote('HGLG11', 100)],
    )

    expect(composition.slices).toHaveLength(1)
    expect(composition.slices[0].topTicker).toBe('HGLG11')
    expect(composition.slices[0].valueBRL).toBe(1100)
  })

  it('empate de valor desempata por ordem alfabética, não pela ordem do banco', () => {
    const positions = [position('ZZZZ11', 'fii', 10), position('AAAA11', 'fii', 10)]
    const quotes = [quote('ZZZZ11', 100), quote('AAAA11', 100)]

    expect(compose(positions, quotes).slices[0].topTicker).toBe('AAAA11')
    expect(compose([...positions].reverse(), quotes).slices[0].topTicker).toBe('AAAA11')
  })

  it('classe com uma posição só tem essa posição como principal', () => {
    const composition = compose([position('PETR4', 'stock_br', 100)], [quote('PETR4', 20)])

    expect(composition.slices[0].topTicker).toBe('PETR4')
  })
})

describe('deriveComposition — posição sem cotação', () => {
  /**
   * Contá-la como R$ 0 criaria uma fatia falsa de 0% e, pior, sugeriria que o
   * ativo não vale nada. Fora da conta é a resposta honesta.
   */
  it('não entra em fatia nenhuma nem na exposição internacional', () => {
    const composition = compose(
      [
        position('PETR4', 'stock_br', 100),
        position('AAPL', 'stock_us', 10, 'USD'), // sem cotação
      ],
      [quote('PETR4', 20)],
    )

    expect(composition.totalBRL).toBe(2000)
    expect(composition.slices).toHaveLength(1)
    expect(composition.slices[0].type).toBe('stock_br')
    expect(composition.slices[0].percent).toBe(100)
    expect(composition.internationalPercent).toBe(0)
  })

  it('posição em USD sem taxa de câmbio também fica fora', () => {
    const composition = compose(
      [position('PETR4', 'stock_br', 100), position('AAPL', 'stock_us', 10, 'USD')],
      [quote('PETR4', 20), quote('AAPL', 100)],
      null,
    )

    expect(composition.slices).toHaveLength(1)
    expect(composition.internationalPercent).toBe(0)
  })

  it('valor ilegível (NaN) não é somado como zero', () => {
    // Quantidade ilegível produz `marketValueBRL` nulo na derivação; a fatia
    // não pode existir com `NaN` dentro nem contaminar o percentual.
    const composition = compose(
      [
        position('PETR4', 'stock_br', 100),
        { ...position('VALE3', 'stock_br', 0), quantity: 'n/d' as unknown as number },
      ],
      [quote('PETR4', 20), quote('VALE3', 30)],
    )

    expect(composition.slices).toHaveLength(1)
    expect(composition.slices[0].valueBRL).toBe(2000)
    expect(Number.isFinite(composition.slices[0].percent)).toBe(true)
  })
})

describe('deriveComposition — total zero', () => {
  it('nenhuma posição avaliada devolve composição vazia, sem divisão por zero', () => {
    const composition = compose([position('PETR4', 'stock_br', 100)], [])

    expect(composition.slices).toEqual([])
    expect(composition.totalBRL).toBe(0)
    expect(composition.internationalPercent).toBe(0)
    expect(composition.internationalValueBRL).toBe(0)
    expect(Number.isNaN(composition.internationalPercent)).toBe(false)
  })

  it('carteira vazia devolve composição vazia', () => {
    const composition = deriveComposition([], 0)

    expect(composition.slices).toEqual([])
    expect(composition.totalBRL).toBe(0)
  })

  it('total negativo ou ilegível não produz percentuais', () => {
    const rows: PositionRow[] = derive([position('PETR4', 'stock_br', 100)], [quote('PETR4', 20)]).rows

    for (const total of [-1, 0, Number.NaN, Number.POSITIVE_INFINITY]) {
      const composition = deriveComposition(rows, total)
      expect(composition.slices).toEqual([])
      expect(composition.internationalPercent).toBe(0)
    }
  })

  /** Objeto novo a cada chamada: um singleton vazio compartilhado seria mutável. */
  it('não compartilha o objeto vazio entre chamadas', () => {
    const first = deriveComposition([], 0)
    const second = deriveComposition([], 0)

    expect(first).not.toBe(second)
    expect(first.slices).not.toBe(second.slices)
  })
})

describe('deriveComposition — classe ausente no catálogo', () => {
  /**
   * Uma posição avaliada sem `type` já está dentro do total da carteira.
   * Descartá-la das fatias faria os percentuais somarem menos de 100% sem
   * nenhuma pista do motivo — some do gráfico, mas continua no denominador.
   */
  it('agrupa em "Outros" e mantém a soma em 100%', () => {
    const composition = compose(
      [position('PETR4', 'stock_br', 100), position('XXXX3', null, 50)],
      [quote('PETR4', 20), quote('XXXX3', 20)],
    )

    // 2.000 + 1.000 = 3.000.
    expect(composition.totalBRL).toBe(3000)
    expect(composition.slices.map((slice) => slice.type)).toEqual([
      'stock_br',
      UNKNOWN_ASSET_CLASS,
    ])
    expect(composition.slices.map((slice) => slice.label)).toEqual(['Ações BR', 'Outros'])

    const sum = composition.slices.reduce((total, slice) => total + slice.percent, 0)
    expect(sum).toBeCloseTo(100, 10)
  })

  it('"Outros" fica no fim da ordem, depois das classes conhecidas', () => {
    const composition = compose(
      [position('XXXX3', null, 50), position('BTC', 'crypto', 1, 'USD')],
      [quote('XXXX3', 20), quote('BTC', 200)],
    )

    expect(composition.slices[composition.slices.length - 1].type).toBe(UNKNOWN_ASSET_CLASS)
  })

  it('"Outros" não é contado como exposição internacional', () => {
    const composition = compose([position('XXXX3', null, 50)], [quote('XXXX3', 20)])

    expect(composition.internationalPercent).toBe(0)
    expect(isInternationalClass(UNKNOWN_ASSET_CLASS)).toBe(false)
  })

  it('tem ticker principal como qualquer outra classe', () => {
    const composition = compose(
      [position('AAAA3', null, 10), position('BBBB3', null, 100)],
      [quote('AAAA3', 20), quote('BBBB3', 20)],
    )

    expect(composition.slices[0].topTicker).toBe('BBBB3')
  })
})

describe('rótulos e ordem das classes', () => {
  it('as seis classes do catálogo têm rótulo em pt-BR', () => {
    expect(ASSET_CLASS_LABEL).toEqual({
      stock_br: 'Ações BR',
      fii: 'FIIs',
      bdr: 'BDRs',
      stock_us: 'Stocks US',
      reit: 'REITs',
      crypto: 'Cryptos',
    })
  })

  it('a ordem de exibição cobre todas as classes, sem repetição', () => {
    expect([...ASSET_CLASS_ORDER].sort()).toEqual(Object.keys(ASSET_CLASS_LABEL).sort())
    expect(new Set(ASSET_CLASS_ORDER).size).toBe(ASSET_CLASS_ORDER.length)
  })

  it('o bucket desconhecido tem rótulo próprio', () => {
    expect(assetClassLabel(UNKNOWN_ASSET_CLASS)).toBe('Outros')
    expect(assetClassLabel('stock_br')).toBe('Ações BR')
  })

  it('cada classe tem uma cor própria e distinta', () => {
    // A cor é redundante com o rótulo, mas duas classes com a mesma cor tornam
    // as fatias da pizza indistinguíveis. Este teste falha se uma cor for
    // duplicada ou deixar de ser um hex de 6 dígitos.
    const colors = [
      ...ASSET_CLASS_ORDER.map((type) => ASSET_CLASS_COLOR[type]),
      UNKNOWN_ASSET_CLASS_COLOR,
    ]

    for (const color of colors) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i)
    }

    expect(new Set(colors).size).toBe(colors.length)
  })

  it('assetClassColor cobre o bucket desconhecido', () => {
    expect(assetClassColor('stock_br')).toBe(ASSET_CLASS_COLOR.stock_br)
    expect(assetClassColor(UNKNOWN_ASSET_CLASS)).toBe(UNKNOWN_ASSET_CLASS_COLOR)
  })
})
