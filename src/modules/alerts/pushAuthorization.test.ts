import { expect, it, vi } from 'vitest'
import { authorizePush } from '../../../supabase/functions/send-alert-push/authorization'

it('nega ausência e formato inválido sem consultar credenciais', async () => {
  const check = vi.fn()
  expect(await authorizePush(null, 'runtime', check)).toBe(false)
  expect(await authorizePush('Basic runtime', 'runtime', check)).toBe(false)
  expect(await authorizePush('Bearer runtime', '', check)).toBe(false)
  expect(check).not.toHaveBeenCalled()
})

it('aceita somente a chave exata do runtime, com esquema Bearer sem depender de caixa', async () => {
  const check = vi.fn()
  expect(await authorizePush('bearer runtime', 'runtime', check)).toBe(true)
  expect(check).not.toHaveBeenCalled()
})

it('valida a credencial do agendador por hash e não transmite o segredo para a RPC', async () => {
  const digest = vi.fn().mockResolvedValue(new Uint8Array(32).fill(1).buffer)
  vi.stubGlobal('crypto', { subtle: { digest } })
  try {
    const check = vi.fn().mockResolvedValue(true)
    expect(await authorizePush('Bearer scheduler', 'runtime', check)).toBe(true)
    expect(digest).toHaveBeenCalledWith('SHA-256', new TextEncoder().encode('scheduler'))
    expect(check).toHaveBeenCalledWith('01'.repeat(32))
    expect(check).not.toHaveBeenCalledWith('scheduler')
  } finally { vi.unstubAllGlobals() }
})

it('nega token de usuário ou falha na consulta ao Vault sem confiar em claims', async () => {
  vi.stubGlobal('crypto', { subtle: { digest: vi.fn().mockResolvedValue(new Uint8Array(32).buffer) } })
  try {
    expect(await authorizePush('Bearer ey-falso', 'runtime', vi.fn().mockResolvedValue(false))).toBe(false)
    expect(await authorizePush('Bearer scheduler', 'runtime', vi.fn().mockRejectedValue(new Error('offline')))).toBe(false)
  } finally { vi.unstubAllGlobals() }
})
