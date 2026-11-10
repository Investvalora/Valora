import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { StrategyForm } from './StrategyForm'
import { useAuthStore } from '../../auth/store'
import type { StrategyInput, ValuationStrategy } from '../hooks/useStrategies'

const save = vi.hoisted(() => vi.fn())
vi.mock('../hooks/useStrategies', () => ({ useStrategies: () => ({ save: { mutateAsync: save, isPending: false } }) }))
const initial: StrategyInput = { name: '', method: 'bazin', min_dy: 0.06, safety_discount: 0, show_in_assets: true }
const original: ValuationStrategy = { ...initial, id: 's1', name: 'Original' }
beforeEach(() => {
  sessionStorage.clear(); save.mockReset().mockResolvedValue({})
  useAuthStore.setState({ user: { id: 'owner' } as never })
})
function change(label: string, value: string) { fireEvent.change(screen.getByLabelText(label), { target: { value } }) }
function form(editing?: ValuationStrategy, source = initial) {
  return <StrategyForm editing={editing} initialDraft={source} onSuccess={() => {}} onCancel={() => {}} />
}
it('restaura nome e percentuais após recarga sem salvar e limpa ao cancelar', () => {
  let view = render(form())
  change('Nome da estratégia', 'Minha renda'); change('DY mínimo (%)', '8')
  view.unmount(); view = render(form())
  expect(screen.getByLabelText('Nome da estratégia')).toHaveValue('')
  fireEvent.click(screen.getByRole('button', { name: 'Restaurar rascunho' }))
  expect(screen.getByLabelText('Nome da estratégia')).toHaveValue('Minha renda')
  expect(screen.getByLabelText('DY mínimo (%)')).toHaveValue(8)
  expect(save).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  view.unmount(); render(form())
  expect(screen.queryByRole('button', { name: 'Restaurar rascunho' })).not.toBeInTheDocument()
})
it('preserva rascunho em falha de envio e limpa após sucesso explícito', async () => {
  save.mockRejectedValueOnce(new Error('offline'))
  let view = render(form()); change('Nome da estratégia', 'Teste')
  fireEvent.click(screen.getByRole('button', { name: 'Criar estratégia' }))
  await screen.findByRole('alert')
  view.unmount(); view = render(form())
  fireEvent.click(screen.getByRole('button', { name: 'Restaurar rascunho' }))
  fireEvent.click(screen.getByRole('button', { name: 'Criar estratégia' }))
  await waitFor(() => expect(save).toHaveBeenCalledTimes(2))
  await waitFor(() => expect(sessionStorage.length).toBe(0))
  expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'Teste', min_dy: 0.06 }))
})
it('não oferece edição sobre versão alterada da estratégia', () => {
  const first = render(form(original)); change('Nome da estratégia', 'Edição pendente'); first.unmount()
  render(form({ ...original, min_dy: 0.08 }))
  expect(screen.getByLabelText('Nome da estratégia')).toHaveValue('Original')
  expect(screen.queryByRole('button', { name: 'Restaurar rascunho' })).not.toBeInTheDocument()
})
it('isola a criação por conta e pelos parâmetros vindos da calculadora', () => {
  const view = render(form()); change('Nome da estratégia', 'Privado')
  act(() => useAuthStore.setState({ user: { id: 'other' } as never }))
  expect(screen.getByLabelText('Nome da estratégia')).toHaveValue('')
  expect(screen.queryByRole('button', { name: 'Restaurar rascunho' })).not.toBeInTheDocument()
  act(() => useAuthStore.setState({ user: { id: 'owner' } as never }))
  view.unmount(); render(form(undefined, { ...initial, min_dy: 0.09 }))
  expect(screen.queryByRole('button', { name: 'Restaurar rascunho' })).not.toBeInTheDocument()
})
it('preserva limites incompletos de regra customizada sem torná-los válidos para envio', () => {
  const source: StrategyInput = { ...initial, method: 'custom', custom_rules: [{ metric: 'pl', operator: 'between', min: 1, max: NaN }] }
  const view = render(form(undefined, source)); change('Nome da estratégia', 'Incompleta'); view.unmount()
  render(form(undefined, source)); fireEvent.click(screen.getByRole('button', { name: 'Restaurar rascunho' }))
  expect(screen.getByLabelText('Nome da estratégia')).toHaveValue('Incompleta')
  expect(screen.getByRole('button', { name: 'Criar estratégia' })).toBeDisabled()
  expect(save).not.toHaveBeenCalled()
})
