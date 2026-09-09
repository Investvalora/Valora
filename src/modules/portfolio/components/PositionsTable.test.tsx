import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PositionsTable } from './PositionsTable'
import {
  DEFAULT_POSITION_SORT,
  derivePositionRows,
  DerivePositionRowsInput,
  nextSort,
  sortPositionRows,
} from '../positionRows'
import type { LatestQuote, PositionSort, PositionSortColumn, PositionWithAsset } from '../types'

/**
 * As posições chegam do PostgREST, onde `NUMERIC` pode vir como string e o join
 * do catálogo pode vir nulo. Os tipos descrevem o caso feliz; a tabela recebe o
 * que o banco devolver, e é isso que estes testes exercitam.
 */
function position(overrides: Partial<PositionWithAsset> = {}): PositionWithAsset {
  return {
    id: 'pos-1',
    user_id: '11111111-1111-4111-8111-111111111111',
    ticker: 'PETR4',
    quantity: 100,
    average_price: 32.1,
    acquisition_date: '2026-01-15',
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
    asset: { ticker: 'PETR4', name: 'Petrobras PN', type: 'stock_br', currency: 'BRL' },
    ...overrides,
  } as PositionWithAsset
}

/** Dia de referência fixo: a flag de cotação antiga é relativa a ele. */
const TODAY = '2026-02-10'

function quote(overrides: Partial<LatestQuote> = {}): LatestQuote {
  return {
    ticker: 'PETR4',
    close: 34.5,
    source: 'b3_cotahist',
    date: TODAY,
    updated_at: '2026-02-10T21:30:00Z',
    ...overrides,
  }
}

/**
 * A tabela recebe linhas derivadas, então os testes passam pela derivação real
 * em vez de montar `PositionRow` à mão: um teste que fabrica o resultado do
 * cálculo não prova que a tela mostra o cálculo.
 */
function renderTable(input: Partial<DerivePositionRowsInput> = {}, sort = DEFAULT_POSITION_SORT) {
  const derived = derivePositionRows({
    positions: input.positions ?? [position()],
    quotes: input.quotes ?? [],
    usdRate: input.usdRate ?? 5,
    today: input.today ?? TODAY,
  })

  return render(
    <PositionsTable
      rows={sortPositionRows(derived.rows, sort)}
      sort={sort}
      onSortChange={() => {}}
    />,
  )
}

/**
 * Célula pela coluna, e não por índice: a Story 2.3 acrescentou quatro colunas
 * no meio da tabela, e asserções ancoradas em `cells[2]` passariam a olhar
 * outro dado sem falhar.
 *
 * `row.children` mantém o alinhamento com os headers porque inclui o `th` do
 * ticker, que é `rowheader` e ficaria fora de `getAllByRole('cell')`.
 */
function cellText(header: string | RegExp, rowName: RegExp = /PETR4/): string {
  const table = screen.getByRole('table')
  const headers = within(table).getAllByRole('columnheader')
  const index = headers.findIndex((element) =>
    typeof header === 'string'
      ? (element.textContent ?? '').toLowerCase().includes(header.toLowerCase())
      : header.test(element.textContent ?? ''),
  )

  if (index === -1) throw new Error(`Coluna não encontrada: ${header}`)

  const row = screen.getByRole('row', { name: rowName })
  return (row.children[index] as HTMLElement).textContent ?? ''
}

describe('PositionsTable — moeda do ativo', () => {
  it('formata em BRL quando o ativo é cotado em BRL', () => {
    renderTable()

    expect(cellText('Preço médio')).toContain('R$')
    expect(cellText('Preço médio')).toContain('32,10')
  })

  /**
   * O preço médio está na moeda de `assets.currency`. Rotular um stock
   * americano como R$ mostra um número que não existe: 32,10 dólares exibidos
   * como 32,10 reais. Sem passar `currency` adiante, `Intl` cai no default do
   * locale e todo preço vira R$.
   */
  it('não rotula ativo em USD como R$', () => {
    renderTable({
      positions: [
        position({
          ticker: 'AAPL',
          asset: { ticker: 'AAPL', name: 'Apple Inc', type: 'stock_us', currency: 'USD' },
        }),
      ],
    })

    expect(cellText('Preço médio', /AAPL/)).not.toContain('R$')
    expect(cellText('Preço médio', /AAPL/)).toMatch(/US\$|\$/)
  })

  it('moeda malformada não derruba a tabela nem inventa R$', () => {
    // `Intl.NumberFormat` lança `RangeError` com qualquer coisa que não seja um
    // código de três letras, e o RangeError levaria a página inteira.
    for (const currency of ['', 'REAL', 'B', '123']) {
      const { unmount } = renderTable({
        positions: [
          position({
            asset: {
              ticker: 'PETR4',
              name: 'Petrobras PN',
              type: 'stock_br',
              currency: currency as 'BRL',
            },
          }),
        ],
      })

      expect(cellText('Preço médio')).toContain('32,10')
      expect(cellText('Preço médio')).not.toContain('R$')
      unmount()
    }
  })

  it('ativo ausente no join não derruba a tabela', () => {
    renderTable({ positions: [position({ asset: null })] })

    expect(cellText('Preço médio')).toContain('32,10')
    expect(cellText('Nome')).toBe('—')
  })
})

describe('PositionsTable — números não parseáveis', () => {
  it('preço médio ilegível vira lacuna, não R$ NaN', () => {
    renderTable({ positions: [position({ average_price: 'n/d' as unknown as number })] })

    expect(cellText('Preço médio')).not.toContain('NaN')
    expect(cellText('Preço médio')).toBe('—')
  })

  it.each(['n/d', '', '   '])('quantidade ilegível %j vira lacuna, não NaN nem 0', (raw) => {
    renderTable({ positions: [position({ quantity: raw as unknown as number })] })

    expect(cellText('Quantidade')).not.toContain('NaN')
    expect(cellText('Quantidade')).toBe('—')
  })

  it('numeric que chega como string é formatado normalmente', () => {
    renderTable({
      positions: [
        position({
          quantity: '100.50000000' as unknown as number,
          average_price: '32.1000' as unknown as number,
        }),
      ],
      quotes: [quote({ close: '34.5000' as unknown as number })],
    })

    expect(cellText('Quantidade')).toBe('100,5')
    expect(cellText('Preço médio')).toContain('32,10')
    // A cotação também vem de uma coluna NUMERIC.
    expect(cellText('Cotação')).toContain('34,50')
  })
})

describe('PositionsTable — data de aquisição', () => {
  /**
   * `new Date('2026-01-05')` é interpretado em UTC e, em fuso negativo, exibe
   * 04/01. O fuso do runner é fixado em `vite.config.ts` justamente para que
   * essa regressão não passe verde: num runner UTC ela passaria.
   */
  it('o runner roda em fuso negativo, senão o teste abaixo não prova nada', () => {
    // America/Sao_Paulo é UTC-3 fixo desde 2019: 180 minutos.
    expect(new Date().getTimezoneOffset()).toBe(180)
    expect(new Date('2026-01-05').getDate()).toBe(4)
  })

  it('exibe o dia que está na string ISO, sem deslocar pelo fuso', () => {
    renderTable({ positions: [position({ acquisition_date: '2026-01-05' })] })

    expect(cellText('Data de aquisição')).toBe('05/01/2026')
  })

  it('data em formato inesperado é exibida como veio, sem virar Invalid Date', () => {
    renderTable({ positions: [position({ acquisition_date: 'sem data' })] })

    expect(cellText('Data de aquisição')).toBe('sem data')
  })
})

describe('PositionsTable — cotação, valor de mercado, peso e variação', () => {
  it('exibe cotação, valor de mercado em BRL, peso e variação sobre o preço médio', () => {
    renderTable({ positions: [position()], quotes: [quote()] })

    expect(cellText('Cotação')).toContain('34,50')
    // 100 × 34,50
    expect(cellText('Valor de mercado')).toContain('3.450,00')
    // Única posição avaliada: todo o peso está nela.
    expect(cellText('Peso')).toBe('100,00%')
    // (34,50 − 32,10) / 32,10 = +7,48%
    expect(cellText('Variação')).toBe('+7,48%')
  })

  it('variação negativa aparece com sinal', () => {
    renderTable({ positions: [position()], quotes: [quote({ close: 30 })] })

    expect(cellText('Variação')).toBe('-6,54%')
  })

  /** Conversão vale para toda `currency = 'USD'`, inclusive cripto. */
  it('converte posição em USD para BRL no valor de mercado, mantendo a cotação em dólar', () => {
    renderTable({
      positions: [
        position({
          ticker: 'AAPL',
          quantity: 10,
          average_price: 120,
          asset: { ticker: 'AAPL', name: 'Apple Inc', type: 'stock_us', currency: 'USD' },
        }),
      ],
      quotes: [quote({ ticker: 'AAPL', close: 150 })],
      usdRate: 5.12,
    })

    expect(cellText('Cotação', /AAPL/)).not.toContain('R$')
    // 10 × 150 × 5,12 = 7.680,00
    expect(cellText('Valor de mercado', /AAPL/)).toContain('R$')
    expect(cellText('Valor de mercado', /AAPL/)).toContain('7.680,00')
  })

  it('sem cotação na janela, a posição continua listada e os derivados ficam vazios', () => {
    renderTable({ positions: [position()], quotes: [] })

    expect(screen.getByRole('row', { name: /PETR4/ })).toBeInTheDocument()
    for (const column of ['Cotação', 'Valor de mercado', 'Peso', 'Variação']) {
      expect(cellText(column)).toBe('—')
      // Zero afirmaria que a posição não vale nada; a verdade é que ninguém sabe.
      expect(cellText(column)).not.toContain('0,00')
    }
  })

  it('pesos das posições avaliadas somam 100%', () => {
    renderTable({
      positions: [
        position({ id: 'p1', ticker: 'PETR4', quantity: 100 }),
        position({
          id: 'p2',
          ticker: 'VALE3',
          quantity: 50,
          asset: { ticker: 'VALE3', name: 'Vale ON', type: 'stock_br', currency: 'BRL' },
        }),
      ],
      quotes: [quote({ ticker: 'PETR4', close: 30 }), quote({ ticker: 'VALE3', close: 60 })],
    })

    // 3.000 e 3.000 → 50% cada.
    expect(cellText('Peso', /PETR4/)).toBe('50,00%')
    expect(cellText('Peso', /VALE3/)).toBe('50,00%')
  })
})

describe('PositionsTable — cotação antiga', () => {
  it('não sinaliza fechamento de ontem', () => {
    // 2026-02-09 (segunda) visto em 2026-02-10 (terça): 0 pregões entre elas.
    renderTable({ positions: [position()], quotes: [quote({ date: '2026-02-09' })] })

    expect(screen.queryByText(/Cotação antiga/)).toBeNull()
  })

  it('sinaliza fechamento com mais de um pregão de atraso', () => {
    // 2026-02-05 (quinta) visto em 2026-02-10 (terça): sexta e segunda entre
    // elas = 2 pregões (> 1) → antiga.
    renderTable({ positions: [position()], quotes: [quote({ date: '2026-02-05' })] })

    expect(cellText('Cotação')).toContain('Cotação antiga')
  })

  it('não sinaliza cotação de sexta vista na segunda seguinte', () => {
    // 2026-02-06 (sexta) visto em 2026-02-09 (segunda): 0 pregões de atraso —
    // o fim de semana não conta. Era o falso positivo semanal antes da correção.
    renderTable({
      positions: [position()],
      quotes: [quote({ date: '2026-02-06' })],
      today: '2026-02-09',
    })

    expect(screen.queryByText(/Cotação antiga/)).toBeNull()
  })

  /** A virada de mês é onde aritmética de data mal feita quebra. */
  it('atravessa a virada de mês sem falso positivo', () => {
    renderTable({
      positions: [position()],
      quotes: [quote({ date: '2026-02-28' })],
      today: '2026-03-01',
    })

    expect(screen.queryByText(/Cotação antiga/)).toBeNull()
  })

  /**
   * A flag é sobre o dia do fechamento, não sobre quando a linha foi gravada:
   * numa ingestão de sábado `updated_at` é de hoje e o `close` é de terça.
   */
  it('olha a data do fechamento e não o updated_at recente', () => {
    renderTable({
      positions: [position()],
      quotes: [quote({ date: '2026-02-05', updated_at: '2026-02-10T12:00:00Z' })],
    })

    expect(cellText('Cotação')).toContain('Cotação antiga')
  })
})

describe('PositionsTable — rastreabilidade da cotação', () => {
  it('abre a procedência por clique e mostra fonte, fechamento e registro', async () => {
    renderTable({ positions: [position()], quotes: [quote({ date: '2026-02-09' })] })

    const trigger = screen.getByRole('button', { name: 'Procedência da cotação de PETR4' })
    // Requisito é ícone clicável: sem clique, nada é exibido (hover não existe
    // em toque nem no teclado).
    expect(screen.queryByRole('tooltip')).toBeNull()

    const user = userEvent.setup()
    await user.click(trigger)

    const tooltip = screen.getByRole('tooltip')
    expect(tooltip).toHaveTextContent('b3_cotahist')
    expect(tooltip).toHaveTextContent('09/02/2026')
    expect(trigger).toHaveAttribute('aria-describedby', tooltip.id)
  })

  it('não oferece procedência quando não há cotação', () => {
    renderTable({ positions: [position()], quotes: [] })

    expect(screen.queryByRole('button', { name: /Procedência/ })).toBeNull()
  })
})

describe('PositionsTable — ordenação', () => {
  /** Harness com estado, para observar `aria-sort` mudando de coluna. */
  function SortableTable() {
    const [sort, setSort] = useState<PositionSort>(DEFAULT_POSITION_SORT)
    const derived = derivePositionRows({
      positions: [
        position({ id: 'p1', ticker: 'PETR4', quantity: 100, average_price: 32.1 }),
        position({
          id: 'p2',
          ticker: 'AAPL4',
          quantity: 1,
          average_price: 10,
          asset: { ticker: 'AAPL4', name: 'Apple BDR', type: 'bdr', currency: 'BRL' },
        }),
      ],
      quotes: [quote({ ticker: 'PETR4', close: 34.5 }), quote({ ticker: 'AAPL4', close: 5 })],
      usdRate: 5,
      today: TODAY,
    })

    return (
      <PositionsTable
        rows={sortPositionRows(derived.rows, sort)}
        sort={sort}
        onSortChange={(column: PositionSortColumn) => setSort((c) => nextSort(c, column))}
      />
    )
  }

  function tickerOrder(): string[] {
    return screen
      .getAllByRole('rowheader')
      .map((header) => header.textContent ?? '')
  }

  it('começa por peso decrescente', () => {
    render(<SortableTable />)

    expect(tickerOrder()).toEqual(['PETR4', 'AAPL4'])
    expect(screen.getByRole('columnheader', { name: /Peso/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    )
    expect(screen.getByRole('columnheader', { name: /Ticker/ })).toHaveAttribute(
      'aria-sort',
      'none',
    )
  })

  it('alterna para ticker e move o aria-sort de coluna', async () => {
    render(<SortableTable />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /Ticker/ }))

    expect(tickerOrder()).toEqual(['AAPL4', 'PETR4'])
    expect(screen.getByRole('columnheader', { name: /Ticker/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )
    expect(screen.getByRole('columnheader', { name: /Peso/ })).toHaveAttribute('aria-sort', 'none')
  })

  it('alterna para variação e inverte no segundo clique', async () => {
    render(<SortableTable />)
    const user = userEvent.setup()

    // PETR4 +7,48% contra AAPL4 −50%.
    await user.click(screen.getByRole('button', { name: /Variação/ }))
    expect(tickerOrder()).toEqual(['PETR4', 'AAPL4'])
    expect(screen.getByRole('columnheader', { name: /Variação/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    )

    await user.click(screen.getByRole('button', { name: /Variação/ }))
    expect(tickerOrder()).toEqual(['AAPL4', 'PETR4'])
    expect(screen.getByRole('columnheader', { name: /Variação/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )
  })

  /**
   * Linha sem cotação não tem peso nem variação: invertê-la para o topo faria a
   * ordenação ser sobre um valor que não existe.
   */
  it('mantém linhas sem cotação no fim em qualquer direção', async () => {
    function WithGap() {
      const [sort, setSort] = useState<PositionSort>(DEFAULT_POSITION_SORT)
      const derived = derivePositionRows({
        positions: [
          position({ id: 'p1', ticker: 'PETR4' }),
          position({
            id: 'p2',
            ticker: 'ZZZZ3',
            asset: { ticker: 'ZZZZ3', name: 'Sem cotação', type: 'stock_br', currency: 'BRL' },
          }),
        ],
        quotes: [quote({ ticker: 'PETR4' })],
        usdRate: 5,
        today: TODAY,
      })

      return (
        <PositionsTable
          rows={sortPositionRows(derived.rows, sort)}
          sort={sort}
          onSortChange={(column: PositionSortColumn) => setSort((c) => nextSort(c, column))}
        />
      )
    }

    render(<WithGap />)
    const user = userEvent.setup()

    expect(tickerOrder()).toEqual(['PETR4', 'ZZZZ3'])

    await user.click(screen.getByRole('button', { name: /Peso/ }))
    expect(screen.getByRole('columnheader', { name: /Peso/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )
    expect(tickerOrder()).toEqual(['PETR4', 'ZZZZ3'])
  })

  it('clique no header pede a nova coluna ao pai', () => {
    const onSortChange = vi.fn()
    const derived = derivePositionRows({
      positions: [position()],
      quotes: [quote()],
      usdRate: 5,
      today: TODAY,
    })

    render(
      <PositionsTable
        rows={derived.rows}
        sort={DEFAULT_POSITION_SORT}
        onSortChange={onSortChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Ticker/ }))

    expect(onSortChange).toHaveBeenCalledWith('ticker')
  })
})

describe('PositionsTable — estado vazio', () => {
  it('convida ao primeiro cadastro quando não há posição', () => {
    render(
      <PositionsTable rows={[]} sort={DEFAULT_POSITION_SORT} onSortChange={() => {}} />,
    )

    expect(screen.getByText('Nenhuma posição cadastrada')).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()
  })
})
