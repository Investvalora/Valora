import { updateRange } from './updateDates'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import { DataUpdateSummary, QuoteUpdateNote } from './DataUpdateSummary'
it('separa gravação e referência, preserva intervalos e não inventa próximo horário da fonte', () => {
  render(<DataUpdateSummary nextCheck={Date.parse('2026-11-24T17:05:00Z')} paused={false} sources={[{ name: 'Cotações', expected: 2, records: [
    { updatedAt: '2026-11-24T17:00:00Z', reference: '2026-11-23', source: 'brapi' },
    { updatedAt: '2026-11-24T16:00:00Z', reference: '2026-11-20', source: 'yahoo' },
  ] }]} />)
  const card = within(screen.getByRole('article', { name: 'Cotações' }))
  expect(card.getByText('24/11/2026, 13:00 a 24/11/2026, 14:00')).toBeVisible()
  expect(card.getByText('20/11/2026 a 23/11/2026')).toBeVisible()
  expect(card.getByText('Horário não disponibilizado neste painel')).toBeVisible()
  expect(screen.getByText(/aproximadamente/)).toHaveTextContent('14:05')
  fireEvent.click(screen.getByRole('button', { name: /Como funciona/ }))
  expect(screen.getByRole('dialog')).toHaveTextContent('não do próximo processamento do fornecedor')
})
it('dados ausentes não viram atualização de hoje e falhas preservam a última informação conhecida', () => {
  render(<DataUpdateSummary nextCheck={null} paused sources={[
    { name: 'Proventos', expected: 1, records: [] },
    { name: 'Fundamentos', expected: 1, records: [{ updatedAt: '2026-11-20T12:00:00Z', reference: '2026-06-30' }], error: true },
    { name: 'Tesouro', expected: 0, records: [] },
  ]} />)
  expect(within(screen.getByRole('article', { name: 'Proventos' })).getByText('Sem informação')).toBeVisible()
  expect(within(screen.getByRole('article', { name: 'Fundamentos' })).getByText('Falha na consulta')).toBeVisible()
  expect(screen.getByText('20/11/2026, 09:00')).toBeVisible()
  expect(within(screen.getByRole('article', { name: 'Tesouro' })).getAllByText('Não se aplica')).toHaveLength(3)
  expect(screen.getByText(/pausada enquanto/)).toBeVisible()
  expect(updateRange(['inválida', null])).toBe('Não informada pela fonte')
})
it('a indicação discreta usa datas dos registros e abre a aba de saúde', () => {
  render(<MemoryRouter><QuoteUpdateNote updates={[{ updatedAt: '2026-11-24T17:00:00Z', reference: '2026-11-23' }]} /></MemoryRouter>)
  expect(screen.getByText(/Cotações gravadas/)).toHaveTextContent('23/11/2026')
  expect(screen.getByRole('link', { name: 'Ver saúde dos dados' })).toHaveAttribute('href', '/analise/ferramentas?tab=health')
})
