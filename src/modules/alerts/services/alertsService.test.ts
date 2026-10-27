import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../shared/services/supabaseClient', async () => {
  const { supabaseMock } = await import('../../../test/supabaseMock')
  return { supabase: supabaseMock.client }
})

import { resetSupabaseMock, supabaseMock } from '../../../test/supabaseMock'
import { alertsService } from './alertsService'

beforeEach(() => resetSupabaseMock())

describe('alertsService', () => {
  it('edita preço-alvo somente na conta e tipo corretos e reinicia monitoramento', async () => {
    supabaseMock.on('alerts', () => ({ data: { id: 'a' }, error: null }))
    await alertsService.editAlert('u', { id: 'a', type: 'price_target', status: 'novo' }, { title: ' Teto ', description: ' Nova condição ', targetPrice: 12.5, condition: 'below' })
    expect(supabaseMock.callArgs('alerts', 'update')).toEqual([[{ title: 'Teto', description: 'Nova condição', target_price: 12.5, condition: 'below', last_quote_date: null, status: 'lido' }]])
    expect(supabaseMock.callArgs('alerts', 'eq')).toEqual([['id', 'a'], ['user_id', 'u'], ['type', 'price_target']])
  })
  it('editar ignorado não reativa nem altera data de exclusão', async () => {
    supabaseMock.on('alerts', () => ({ data: { id: 'a' }, error: null }))
    await alertsService.editAlert('u', { id: 'a', type: 'overvalued', status: 'ignorado' }, { title: 'Teto', description: 'Revisar', targetPrice: 12.5, condition: 'below' })
    expect(supabaseMock.callArgs('alerts', 'update')).toEqual([[{ title: 'Teto', description: 'Revisar' }]])
  })
  it('rejeita campos vazios e preços não finitos antes de escrever', async () => {
    const alert = { id: 'a', type: 'price_target' as const, status: 'lido' as const }
    await expect(alertsService.editAlert('u', alert, { title: ' ', description: 'Texto' })).rejects.toThrow()
    await expect(alertsService.editAlert('u', alert, { title: 'Teto', description: 'Texto', targetPrice: Infinity, condition: 'below' })).rejects.toThrow()
    expect(supabaseMock.callArgs('alerts', 'update')).toEqual([])
  })
  it('atualiza status somente quando a linha do usuário existe', async () => {
    supabaseMock.on('alerts', () => ({ data: { id: 'alert-1' }, error: null }))

    await expect(alertsService.updateStatus('user-a', 'alert-1', 'lido')).resolves.toBeUndefined()
    expect(supabaseMock.callArgs('alerts', 'update')).toEqual([[{ status: 'lido' }]])
    expect(supabaseMock.callArgs('alerts', 'eq')).toEqual([['id', 'alert-1'], ['user_id', 'user-a']])
    expect(supabaseMock.callArgs('alerts', 'single')).toEqual([[]])
  })

  it('propaga falha quando RLS ou o id não permite atualizar o alerta', async () => {
    const error = new Error('Alerta não encontrado ou sem permissão')
    supabaseMock.on('alerts', () => ({ data: null, error }))

    await expect(alertsService.updateStatus('user-b', 'alert-a', 'ignorado')).rejects.toBe(error)
  })
})
