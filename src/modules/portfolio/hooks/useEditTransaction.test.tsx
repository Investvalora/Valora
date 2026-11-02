import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'
import { useEditTransaction } from './useTransactions'
import type { Transaction } from '../services/transactionsService'
const save = vi.hoisted(() => vi.fn())
vi.mock('../../auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }))
vi.mock('../services/transactionsService', () => ({ transactionsService: { editTransaction: save } }))
const original = { id: 'tx', user_id: 'owner', ticker: 'AAPL' } as Transaction
const changes = { type: 'buy' as const, transaction_date: '2026-01-01', quantity: 1, price: 10, brokerage_fee: 0, tax: 0 }
beforeEach(() => save.mockReset().mockResolvedValue({}))
function setup() {
  const client = new QueryClient()
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { invalidate, ...renderHook(() => useEditTransaction(), { wrapper }) }
}
it('atualiza histórico, posições e totais após salvar', async () => {
  const { result, invalidate } = setup()
  await act(async () => { await result.current.mutateAsync({ original, changes }) })
  expect(save).toHaveBeenCalledWith(original,changes)
  expect(invalidate).toHaveBeenCalledOnce()
})
it('atualiza a lista ao detectar conflito para não reabrir snapshot antigo', async () => {
  save.mockRejectedValueOnce({ code: '40001' })
  const { result, invalidate } = setup()
  await act(async () => { await expect(result.current.mutateAsync({ original, changes })).rejects.toEqual({ code: '40001' }) })
  expect(invalidate).toHaveBeenCalledOnce()
})
it('recusa transação de outra conta antes de chamar o serviço', async () => {
  const { result } = setup()
  await act(async () => { await expect(result.current.mutateAsync({ original: { ...original,user_id: 'other' }, changes })).rejects.toThrow() })
  expect(save).not.toHaveBeenCalled()
})
