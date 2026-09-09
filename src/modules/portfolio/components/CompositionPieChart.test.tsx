import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { deriveComposition } from '../composition'
import { derivePositionRows } from '../positionRows'
import type { AssetType, PositionWithAsset } from '../types'
import { CompositionSliceTooltip } from './CompositionPieChart'

/**
 * O tooltip por fatia é o único requisito que depende do gesto de mouse sobre o
 * SVG, e em jsdom o `ResponsiveContainer` mede 0×0: a pizza nunca recebe hover.
 * Testar o conteúdo diretamente é o que impede o requisito de ficar sem
 * verificação nenhuma.
 */

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const formatBRL = (value: number) => brlFormatter.format(value)
const formatPercent = (value: number) =>
  `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}%`

function position(ticker: string, type: AssetType, quantity: number): PositionWithAsset {
  return {
    id: `pos-${ticker}`,
    user_id: '11111111-1111-4111-8111-111111111111',
    ticker,
    quantity,
    average_price: 10,
    acquisition_date: '2026-01-15',
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
    asset: { ticker, name: `${ticker} SA`, type, currency: 'BRL' },
  } as PositionWithAsset
}

/** Composição real: o tooltip mostra a fatia que a derivação produziu. */
function fiiSlice() {
  const derived = derivePositionRows({
    positions: [
      position('HGLG11', 'fii', 10), // 10 × 100 = 1.000
      position('XPML11', 'fii', 100), // 100 × 1 = 100
      position('PETR4', 'stock_br', 100), // 100 × 9 = 900
    ],
    quotes: [
      { ticker: 'HGLG11', close: 100, source: 'b3_cotahist', date: '2026-02-10', updated_at: '' },
      { ticker: 'XPML11', close: 1, source: 'b3_cotahist', date: '2026-02-10', updated_at: '' },
      { ticker: 'PETR4', close: 9, source: 'b3_cotahist', date: '2026-02-10', updated_at: '' },
    ],
    usdRate: 5,
    today: '2026-02-10',
  })

  const composition = deriveComposition(derived.rows, derived.totalBRL)
  const slice = composition.slices.find((candidate) => candidate.type === 'fii')

  if (!slice) throw new Error('fixture sem fatia de FIIs')
  return slice
}

describe('CompositionSliceTooltip', () => {
  it('mostra o valor em R$ da classe e o ticker principal', () => {
    render(
      <CompositionSliceTooltip
        active
        slice={fiiSlice()}
        formatBRL={formatBRL}
        formatPercent={formatPercent}
      />,
    )

    // FIIs: 1.000 + 100 = 1.100 de 2.000 = 55%; principal é o de maior valor.
    expect(screen.getByText('FIIs')).toBeInTheDocument()
    expect(screen.getByText(/R\$\s1\.100,00/)).toBeInTheDocument()
    expect(screen.getByText(/55,00%/)).toBeInTheDocument()
    expect(screen.getByText('Maior posição: HGLG11')).toBeInTheDocument()
  })

  it('não renderiza nada fora do hover', () => {
    const { container } = render(
      <CompositionSliceTooltip
        active={false}
        slice={fiiSlice()}
        formatBRL={formatBRL}
        formatPercent={formatPercent}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('não renderiza nada quando o Recharts não resolve a fatia', () => {
    const { container } = render(
      <CompositionSliceTooltip active formatBRL={formatBRL} formatPercent={formatPercent} />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
