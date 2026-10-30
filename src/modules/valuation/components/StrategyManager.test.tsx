import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { StrategyForm } from './StrategyForm'
import { StrategyManager } from './StrategyManager'

const save = vi.hoisted(() => vi.fn())
const remove = vi.hoisted(() => vi.fn())
vi.mock('../hooks/useStrategies', () => ({ useStrategies: () => ({
  strategies: [{ id: 's', name: 'Minha renda', method: 'bazin', min_dy: 0.08, safety_discount: 0, show_in_assets: true }],
  isLoading: false, isError: false, save: { mutateAsync: save, isPending: false }, remove: { mutateAsync: remove, isPending: false },
}) }))
beforeEach(() => { save.mockReset().mockResolvedValue({}); remove.mockReset().mockResolvedValue({}) })

it('cria uma estratégia nomeada com percentuais em decimal e exibição opcional', async () => {
  const user = userEvent.setup()
  render(<MemoryRouter initialEntries={['/analise/estrategias']}><Routes>
    <Route path="/analise/estrategias" element={<StrategyManager />} />
    <Route path="/analise/estrategias/nova" element={<section role="dialog" aria-label="Nova estratégia"><StrategyForm onSuccess={() => {}} onCancel={() => {}} /></section>} />
  </Routes></MemoryRouter>)
  await user.click(screen.getByRole('button', { name: 'Nova estratégia' }))
  const dialog = within(screen.getByRole('dialog', { name: 'Nova estratégia' }))
  await user.selectOptions(dialog.getByLabelText('Método'), 'bazin')
  await user.type(dialog.getByLabelText('Nome da estratégia'), 'Renda conservadora')
  await user.clear(dialog.getByLabelText('DY mínimo (%)'))
  await user.type(dialog.getByLabelText('DY mínimo (%)'), '8')
  await user.clear(dialog.getByLabelText('Desconto adicional sobre a referência (%)'))
  await user.type(dialog.getByLabelText('Desconto adicional sobre a referência (%)'), '20')
  await user.click(dialog.getByLabelText('Exibir esta estratégia em Ativos'))
  await user.click(dialog.getByRole('button', { name: 'Criar estratégia' }))
  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ name: 'Renda conservadora', method: 'bazin', min_dy: 0.08, safety_discount: 0.2, show_in_assets: false })))
})

it('cria do zero sem Bazin/Graham, exige condição e permite combinar com OU', async () => {
  const user = userEvent.setup()
  render(<MemoryRouter initialEntries={['/analise/estrategias']}><Routes>
    <Route path="/analise/estrategias" element={<StrategyManager />} />
    <Route path="/analise/estrategias/nova" element={<section role="dialog" aria-label="Nova estratégia"><StrategyForm onSuccess={() => {}} onCancel={() => {}} /></section>} />
  </Routes></MemoryRouter>)
  await user.click(screen.getByRole('button', { name: 'Nova estratégia' }))
  const dialog = within(screen.getByRole('dialog', { name: 'Nova estratégia' }))
  expect(dialog.getByLabelText('Método')).toHaveValue('custom')
  await user.type(dialog.getByLabelText('Nome da estratégia'), 'Meus critérios')
  expect(dialog.getByRole('button', { name: 'Criar estratégia' })).toBeDisabled()
  await user.click(dialog.getByRole('button', { name: 'Adicionar condição' }))
  await user.selectOptions(dialog.getByLabelText('Indicador'), 'dy')
  await user.selectOptions(dialog.getByLabelText('Comparação'), 'gte')
  await user.clear(dialog.getByLabelText('Valor de referência'))
  await user.type(dialog.getByLabelText('Valor de referência'), '6')
  await user.selectOptions(dialog.getByLabelText('Combinar condições'), 'any')
  await user.click(dialog.getByRole('button', { name: 'Criar estratégia' }))
  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ method: 'custom', rule_match: 'any', custom_rules: [{ metric: 'dy', operator: 'gte', min: 6 }] })))
})

it('oculta uma estratégia sem alterar as premissas e informa falha ao salvar', async () => {
  const user = userEvent.setup()
  render(<MemoryRouter initialEntries={['/analise/estrategias']}><Routes>
    <Route path="/analise/estrategias" element={<StrategyManager />} />
    <Route path="/analise/estrategias/nova" element={<section role="dialog" aria-label="Nova estratégia"><StrategyForm onSuccess={() => {}} onCancel={() => {}} /></section>} />
  </Routes></MemoryRouter>)
  save.mockRejectedValueOnce(new Error('offline'))
  await user.click(screen.getByLabelText('Exibir em Ativos'))
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ id: 's', min_dy: 0.08, show_in_assets: false }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível alterar a exibição')
  await user.click(screen.getByLabelText('Exibir em Ativos'))
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  expect(save).toHaveBeenCalledTimes(2)
})

it('só exclui a estratégia após confirmar e permite cancelar', async () => {
  const user = userEvent.setup()
  render(<MemoryRouter initialEntries={['/analise/estrategias']}><Routes>
    <Route path="/analise/estrategias" element={<StrategyManager />} />
    <Route path="/analise/estrategias/nova" element={<section role="dialog" aria-label="Nova estratégia"><StrategyForm onSuccess={() => {}} onCancel={() => {}} /></section>} />
  </Routes></MemoryRouter>)
  await user.click(screen.getByRole('button', { name: 'Excluir Minha renda' }))
  expect(remove).not.toHaveBeenCalled()
  await user.click(within(screen.getByRole('dialog', { name: 'Excluir estratégia' })).getByRole('button', { name: 'Cancelar' }))
  expect(remove).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Excluir Minha renda' }))
  await user.click(within(screen.getByRole('dialog', { name: 'Excluir estratégia' })).getByRole('button', { name: 'Excluir estratégia' }))
  await waitFor(() => expect(remove).toHaveBeenCalledWith('s'))
})

it('salva a seleção das classes e exige ao menos uma', async () => {
  const user = userEvent.setup()
  render(<section role="dialog" aria-label="Nova estratégia"><StrategyForm onSuccess={() => {}} onCancel={() => {}} initialDraft={{ name: 'Somente stocks', method: 'graham', min_dy: 0.06, safety_discount: 0, show_in_assets: true, asset_types: ['stock_us'] }} /></section>)
  const dialog = within(screen.getByRole('dialog', { name: 'Nova estratégia' }))
  expect(dialog.getByLabelText('Stocks')).toBeChecked()
  expect(dialog.getByLabelText('Ações brasileiras')).not.toBeChecked()
  expect(dialog.queryByLabelText('FIIs')).not.toBeInTheDocument()
  await user.click(dialog.getByLabelText('Stocks'))
  expect(dialog.getByRole('button', { name: 'Criar estratégia' })).toBeDisabled()
  await user.click(dialog.getByLabelText('Ações brasileiras'))
  await user.click(dialog.getByRole('button', { name: 'Criar estratégia' }))
  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ asset_types: ['stock_br'] })))
})
