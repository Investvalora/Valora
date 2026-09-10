import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../shared/services/supabaseClient', async () => {
  const { supabaseMock } = await import('../../../test/supabaseMock')
  return { supabase: supabaseMock.client }
})

import { resetSupabaseMock, supabaseMock } from '../../../test/supabaseMock'
import { alertsService } from './alertsService'

beforeEach(() => resetSupabaseMock())

describe('alertsService', () => {
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