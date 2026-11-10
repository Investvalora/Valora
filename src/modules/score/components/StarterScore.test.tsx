import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StarterScore } from './StarterScore'
import { STARTER_SCORE } from '../utils/starterScore'
import { applyScoreRules } from '../utils/scoreCalculation'
import type { ScoreRule, FundamentalsRow } from '../types'

const api = vi.hoisted(() => ({ insert: vi.fn(), limit: vi.fn() }))
vi.mock('../../auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }))
vi.mock('../../../shared/services/supabaseClient', () => ({ supabase: { from: () => ({ insert: api.insert, select: () => ({ eq: () => ({ limit: api.limit }) }) }) } }))
beforeEach(() => { api.insert.mockReset().mockResolvedValue({ error: null }); api.limit.mockReset().mockResolvedValue({ data: [] }) })

it('cria os cinco critérios juntos apenas após escolha explícita', async () => {
  render(<QueryClientProvider client={new QueryClient()}><StarterScore /></QueryClientProvider>)
  expect(api.insert).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Criar modelo inicial' }))
  await waitFor(() => expect(api.insert).toHaveBeenCalledTimes(1))
  expect(api.insert.mock.calls[0][0]).toEqual(STARTER_SCORE.map(rule => ({ ...rule, user_id: 'owner' })))
})

it('preserva regras existentes se o estado vazio da tela estiver desatualizado', async () => {
  api.limit.mockResolvedValue({ data: [{ id: 'existing' }] })
  render(<QueryClientProvider client={new QueryClient()}><StarterScore /></QueryClientProvider>)
  fireEvent.click(screen.getByRole('button', { name: 'Criar modelo inicial' }))
  await waitFor(() => expect(api.limit).toHaveBeenCalled())
  expect(api.insert).not.toHaveBeenCalled()
})

it('modelo opcional tem cinco critérios inteiros somando100 sem alterar a escala existente', () => {
  expect(STARTER_SCORE).toHaveLength(5)
  expect(STARTER_SCORE.reduce((sum, rule) => sum + rule.points, 0)).toBe(100)
  const rules = STARTER_SCORE.map((rule, i) => ({ ...rule, id: String(i), user_id: 'u', created_at: '' })) as ScoreRule[]
  const row = { ticker: 'A', pl: 10, pvp: 1, roe: 15, net_margin: 10, dy: 6 } as FundamentalsRow
  expect(applyScoreRules(rules, [row]).get('A')).toBe(100)
  expect(applyScoreRules([{ ...rules[0], points: 6 }], [row]).get('A')).toBe(6)
})
