import { beforeEach, expect, it, vi } from 'vitest'
import { transactionsService, type Transaction } from './transactionsService'
const rpc = vi.hoisted(() => vi.fn())
const single = vi.hoisted(() => vi.fn())
vi.mock('../../../shared/services/supabaseClient', () => ({ supabase: { rpc } }))
const original: Transaction = { id: 'tx',seq: 2,user_id: 'owner',wallet_id: 'w',ticker: 'AAPL',type: 'buy',quantity: 0.0661,price: 302.6,brokerage_fee: 1,tax: 2,transaction_date: '2026-01-05',created_at: '' }
const changes = { type: 'buy' as const,quantity: 0.07,price: 303,brokerage_fee: 1,tax: 2,transaction_date: '2026-01-05' }
beforeEach(() => { rpc.mockReset().mockReturnValue({ single }); single.mockReset().mockResolvedValue({ data: { ...original,...changes },error: null }) })
it('envia valores corrigidos e snapshot financeiro, sem aceitar troca de proprietário/ativo/carteira', async () => {
  await expect(transactionsService.editTransaction(original,changes)).resolves.toMatchObject(changes)
  expect(rpc).toHaveBeenCalledWith('edit_owned_transaction', {
    p_id: 'tx',p_expected: { type: 'buy',transaction_date: '2026-01-05',quantity: 0.0661,price: 302.6,brokerage_fee: 1,tax: 2 },
    p_type: 'buy',p_date: '2026-01-05',p_quantity: 0.07,p_price: 303,p_brokerage_fee: 1,p_tax: 2,
  })
  expect(single).toHaveBeenCalledOnce()
})
it('rejeita data futura antes da RPC e propaga conflito para a interface', async () => {
  await expect(transactionsService.editTransaction(original,{ ...changes,transaction_date: '2999-01-01' })).rejects.toThrow()
  expect(rpc).not.toHaveBeenCalled()
  single.mockResolvedValueOnce({ data: null,error: { code: '40001' } })
  await expect(transactionsService.editTransaction(original,changes)).rejects.toEqual({ code: '40001' })
})
