import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { ScoreBreakdown } from './ScoreBreakdown'
import type { FundamentalsRow, ScoreRule } from '../types'

const rule: ScoreRule = { id: 'r', user_id: 'u', name: 'Qualidade', metric: 'debt_equity', operator: 'lt', threshold_min: 150, threshold_max: null, points: 2, created_at: '' }
const row: FundamentalsRow = { ticker: 'TEST', asset_type: 'stock_us', source: 'yahoo', reference_date: '2026-11-18', updated_at: '', pl: null, pvp: null, roe: 20, dy: 7, debt_equity: 76, net_margin: null }

it('explica dívida e limite na mesma unidade percentual, sem converter o valor', () => {
  render(<ScoreBreakdown rules={[rule]} row={row} />)
  expect(screen.getByText(/Condição:/)).toHaveTextContent('150%')
  expect(screen.getByText(/Observado:/)).toHaveTextContent('76%')
  expect(screen.getByText(/Score final:/)).toHaveTextContent('2')
})

it('explica indicador incompatível com a classe como sem dados', () => {
  render(<ScoreBreakdown rules={[{ ...rule, metric: 'roe' }]} row={{ ...row, asset_type: 'fii' }} />)
  expect(screen.getByText(/Observado:/)).toHaveTextContent('Indisponível · Sem dados')
  expect(screen.getByText(/Score final:/)).toHaveTextContent('0')
})
