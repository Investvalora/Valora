import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { StrictMode } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ScoreRulePage } from './ScoreRulePage'
import { useAuthStore } from '../../auth/store'
import type { ScoreRule } from '../types'

const api = vi.hoisted(() => ({ rules: [] as ScoreRule[], create: vi.fn(), update: vi.fn() }))
vi.mock('../hooks/useScoreRules', () => ({
  useScoreRules: () => ({ data: api.rules, isLoading: false }),
  useCreateScoreRule: () => ({ mutateAsync: api.create, isPending: false }),
  useUpdateScoreRule: () => ({ mutateAsync: api.update, isPending: false }),
  groupRulesByName: (rules: ScoreRule[]) => new Map(rules.map(rule => [rule.name, rules.filter(r => r.name === rule.name)])),
}))
vi.mock('./ScorePreviewPanel', () => ({ ScorePreviewPanel: () => null }))
vi.mock('../../analise/components/AnaliseScore', () => ({ AnaliseScore: () => null }))
vi.mock('../../analise/components/AnaliseVisaoGeral', () => ({ AnaliseVisaoGeral: () => null }))

const original: ScoreRule = { id: 'rule-1', user_id: 'owner', name: 'Qualidade', metric: 'debt_equity', operator: 'lt', threshold_min: 1.5, threshold_max: null, points: 2, created_at: '' }
function open(edit = false) {
  return render(<StrictMode><MemoryRouter initialEntries={[edit ? '/analise/score/rule-1/editar' : '/analise/score/nova']}>
    <Routes><Route path="/analise/score/nova" element={<ScoreRulePage />} /><Route path="/analise/score/:id/editar" element={<ScoreRulePage />} /><Route path="/analise/score" element={<p>Lista de scores</p>} /></Routes>
  </MemoryRouter></StrictMode>)
}
function change(label: string, value: string) { fireEvent.change(screen.getByLabelText(label), { target: { value } }) }
beforeEach(() => {
  sessionStorage.clear()
  api.rules = []
  api.create.mockReset().mockResolvedValue({})
  api.update.mockReset().mockResolvedValue({})
  useAuthStore.setState({ user: { id: 'owner' } as never })
})

it('abre a criação como página e mantém as ações mobile acima da navegação', () => {
  open()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Voltar para Score' })).toBeInTheDocument()
  expect(screen.queryByText('Análise › Score')).not.toBeInTheDocument()
  const actions = screen.getByRole('toolbar', { name: 'Ações da regra' })
  expect(actions).toHaveClass('fixed', 'md:hidden')
  expect(within(actions).getByRole('button', { name: 'Criar regra' })).toBeInTheDocument()
  expect(within(actions).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
})

it('restaura criação incompleta após recarga somente por escolha e limpa ao cancelar', async () => {
  let view = open()
  change('Score', 'Meu score')
  change('Valor de referência', '7.5')
  view.unmount()
  view = open()
  expect(screen.getByLabelText('Score')).toHaveValue('')
  fireEvent.click(screen.getByRole('button', { name: 'Restaurar rascunho' }))
  expect(screen.getByLabelText('Score')).toHaveValue('Meu score')
  expect(screen.getByLabelText('Valor de referência')).toHaveValue(7.5)
  expect(screen.getByLabelText('Pontos')).toHaveValue(null)
  expect(api.create).not.toHaveBeenCalled()
  fireEvent.click(screen.getAllByRole('button', { name: 'Cancelar' })[0])
  await screen.findByText('Lista de scores')
  view.unmount(); open()
  expect(screen.queryByRole('button', { name: 'Restaurar rascunho' })).not.toBeInTheDocument()
})

it('preserva edição e intervalo sem alterar a regra original e limpa após salvar', async () => {
  api.rules = [original]
  const first = open(true)
  change('Operador', 'between'); change('Valor mínimo', '50'); change('Valor máximo', '150')
  first.unmount(); open(true)
  expect(screen.getByLabelText('Valor de referência')).toHaveValue(1.5)
  fireEvent.click(screen.getByRole('button', { name: 'Restaurar rascunho' }))
  expect(screen.getByLabelText('Valor mínimo')).toHaveValue(50)
  expect(screen.getByLabelText('Valor máximo')).toHaveValue(150)
  expect(api.update).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  await waitFor(() => expect(api.update).toHaveBeenCalledWith({ id: 'rule-1', payload: expect.objectContaining({ threshold_min: 50, threshold_max: 150, operator: 'between' }) }))
  await screen.findByText('Lista de scores')
  expect(sessionStorage.length).toBe(0)
  expect(original.threshold_min).toBe(1.5)
})

it('não oferece rascunho sobre snapshot alterado ou outra conta', () => {
  api.rules = [original]
  const first = open(true); change('Valor de referência', '150'); first.unmount()
  api.rules = [{ ...original, points: 3 }]
  const second = open(true)
  expect(screen.queryByRole('button', { name: 'Restaurar rascunho' })).not.toBeInTheDocument()
  expect(screen.getByLabelText('Valor de referência')).toHaveValue(1.5)
  second.unmount(); api.rules = [original]
  useAuthStore.setState({ user: { id: 'other' } as never })
  open(true)
  expect(screen.queryByRole('button', { name: 'Restaurar rascunho' })).not.toBeInTheDocument()
})

it('mantém rascunho após falha ao salvar e descarta explicitamente', async () => {
  api.create.mockRejectedValue(new Error('offline'))
  const log = vi.spyOn(console, 'error').mockImplementation(() => {})
  let view = open(); change('Score', 'Novo'); change('Valor de referência', '7'); change('Pontos', '3')
  fireEvent.click(screen.getAllByRole('button', { name: /^Criar regra$/ })[0])
  await screen.findByRole('alert')
  view.unmount(); view = open()
  expect(screen.getByRole('button', { name: 'Restaurar rascunho' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Descartar rascunho' }))
  view.unmount(); open()
  expect(screen.queryByRole('button', { name: 'Restaurar rascunho' })).not.toBeInTheDocument()
  log.mockRestore()
})

it('remonta o formulário ao trocar de identidade sem copiar campos', () => {
  open(); change('Score', 'Privado')
  act(() => useAuthStore.setState({ user: { id: 'other' } as never }))
  expect(screen.getByLabelText('Score')).toHaveValue('')
  expect(screen.queryByRole('button', { name: 'Restaurar rascunho' })).not.toBeInTheDocument()
})
