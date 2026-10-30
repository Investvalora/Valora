import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { syncAssetData, useAssetDataSyncState } from './assetDataSync'
const invoke = vi.hoisted(() => vi.fn())
vi.mock('../../../shared/services/supabaseClient', () => ({ supabase: { functions: { invoke } } }))
beforeEach(() => { invoke.mockReset(); useAssetDataSyncState.setState({ pending: [], warnings: {} }) })
afterEach(() => vi.restoreAllMocks())

it('sincroniza uma compra sem duplicar chamadas e recarrega todas as fontes após completar', async () => {
  const client = new QueryClient()
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  let finish!: (value: unknown) => void
  invoke.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  const work = syncAssetData(client, 'owner', 'radl3')
  await syncAssetData(client, 'owner', 'RADL3')
  expect(useAssetDataSyncState.getState().pending).toEqual(['RADL3'])
  expect(invoke).toHaveBeenCalledOnce()
  finish({ data: { ticker: 'RADL3', prices: 'updated', dividends: 'updated', fundamentals: 'updated' }, error: null })
  await work
  await syncAssetData(client, 'owner', 'RADL3')
  expect(invoke).toHaveBeenCalledOnce()
  for (const queryKey of [['portfolio', 'quotes'], ['wealth'], ['score', 'fundamentals'], ['dividends'], ['performance']]) expect(invalidate).toHaveBeenCalledWith({ queryKey })
  expect(useAssetDataSyncState.getState()).toEqual({ pending: [], warnings: {} })
})

it('preserva sucesso do lançamento, informa falha e permite repetir sem cache de falha', async () => {
  const client = new QueryClient()
  invoke.mockResolvedValueOnce({ error: new Error('offline') }).mockResolvedValueOnce({ data: { prices: 'updated', dividends: 'no_events', fundamentals: 'not_applicable' } })
  await expect(syncAssetData(client, 'owner', 'RADL3')).resolves.toBeUndefined()
  expect(useAssetDataSyncState.getState().warnings.RADL3).toContain('Seu lançamento foi salvo')
  await syncAssetData(client, 'owner', 'RADL3')
  expect(invoke).toHaveBeenCalledTimes(2)
  expect(useAssetDataSyncState.getState().warnings).toEqual({})
})

it('não guarda resposta parcial por quinze minutos nem confunde ausência de eventos com falha', async () => {
  const client = new QueryClient()
  invoke.mockResolvedValue({ data: { prices: 'updated', dividends: 'no_events', fundamentals: 'unavailable' } })
  await syncAssetData(client, 'owner', 'RADL3')
  expect(useAssetDataSyncState.getState().warnings.RADL3).toContain('fonte gratuita')
  await syncAssetData(client, 'owner', 'RADL3')
  expect(invoke).toHaveBeenCalledTimes(2)
})
