import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PositionsTable } from './PositionsTable'
import type { PositionWithAsset } from '../types'

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

/** Célula de preço médio da única linha renderizada. */
function priceCell(): string {
  const cells = screen.getAllByRole('cell')
  // Ordem das colunas: nome, quantidade, preço médio, data. O ticker é `th`.
  return cells[2].textContent ?? ''
}

describe('PositionsTable — moeda do ativo', () => {
  it('formata em BRL quando o ativo é cotado em BRL', () => {
    render(<PositionsTable positions={[position()]} />)

    expect(priceCell()).toContain('R$')
    expect(priceCell()).toContain('32,10')
  })

  /**
   * O preço médio está na moeda de `assets.currency`. Rotular um stock
   * americano como R$ mostra um número que não existe: 32,10 dólares exibidos
   * como 32,10 reais. Sem passar `currency` adiante, `Intl` cai no default do
   * locale e todo preço vira R$.
   */
  it('não rotula ativo em USD como R$', () => {
    const usPosition = position({
      ticker: 'AAPL',
      asset: { ticker: 'AAPL', name: 'Apple Inc', type: 'stock_us', currency: 'USD' },
    })

    render(<PositionsTable positions={[usPosition]} />)

    expect(priceCell()).not.toContain('R$')
    expect(priceCell()).toMatch(/US\$|\$/)
  })

  it('moeda malformada não derruba a tabela nem inventa R$', () => {
    // `Intl.NumberFormat` lança `RangeError` com qualquer coisa que não seja um
    // código de três letras, e o RangeError levaria a página inteira.
    for (const currency of ['', 'REAL', 'B', '123']) {
      const { unmount } = render(
        <PositionsTable
          positions={[
            position({
              asset: {
                ticker: 'PETR4',
                name: 'Petrobras PN',
                type: 'stock_br',
                currency: currency as 'BRL',
              },
            }),
          ]}
        />,
      )

      expect(priceCell()).toContain('32,10')
      expect(priceCell()).not.toContain('R$')
      unmount()
    }
  })

  it('ativo ausente no join não derruba a tabela', () => {
    render(<PositionsTable positions={[position({ asset: null })]} />)

    expect(priceCell()).toContain('32,10')
    expect(screen.getByRole('row', { name: /PETR4/ })).toHaveTextContent('—')
  })
})

describe('PositionsTable — números não parseáveis', () => {
  it('preço médio ilegível vira lacuna, não R$ NaN', () => {
    render(<PositionsTable positions={[position({ average_price: 'n/d' as unknown as number })]} />)

    expect(priceCell()).not.toContain('NaN')
    expect(priceCell()).toBe('—')
  })

  it.each(['n/d', '', '   '])('quantidade ilegível %j vira lacuna, não NaN nem 0', (raw) => {
    render(<PositionsTable positions={[position({ quantity: raw as unknown as number })]} />)

    const cells = screen.getAllByRole('cell')
    expect(cells[1].textContent).not.toContain('NaN')
    expect(cells[1].textContent).toBe('—')
  })

  it('numeric que chega como string é formatado normalmente', () => {
    render(
      <PositionsTable
        positions={[
          position({
            quantity: '100.50000000' as unknown as number,
            average_price: '32.1000' as unknown as number,
          }),
        ]}
      />,
    )

    const cells = screen.getAllByRole('cell')
    expect(cells[1].textContent).toBe('100,5')
    expect(cells[2].textContent).toContain('32,10')
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
    render(<PositionsTable positions={[position({ acquisition_date: '2026-01-05' })]} />)

    const cells = screen.getAllByRole('cell')
    expect(cells[3].textContent).toBe('05/01/2026')
  })

  it('data em formato inesperado é exibida como veio, sem virar Invalid Date', () => {
    render(<PositionsTable positions={[position({ acquisition_date: 'sem data' })]} />)

    const cells = screen.getAllByRole('cell')
    expect(cells[3].textContent).toBe('sem data')
  })
})

describe('PositionsTable — estado vazio', () => {
  it('convida ao primeiro cadastro quando não há posição', () => {
    render(<PositionsTable positions={[]} />)

    expect(screen.getByText('Nenhuma posição cadastrada')).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()
  })
})
