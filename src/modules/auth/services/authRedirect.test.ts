import { afterEach, describe, expect, it, vi } from 'vitest'
import { authRedirect } from './authRedirect'

afterEach(() => vi.unstubAllEnvs())
describe('destinos da autenticação', () => {
  it('usa a origem publicada configurada para confirmação e recuperação', () => {
    vi.stubEnv('VITE_APP_URL', 'https://valora.example/')
    expect(authRedirect('/login')).toBe('https://valora.example/login')
    expect(authRedirect('/reset-password')).toBe('https://valora.example/reset-password')
  })
  it('usa a origem do navegador quando não há configuração', () => {
    vi.stubEnv('VITE_APP_URL', '')
    expect(authRedirect('/login')).toBe(`${window.location.origin}/login`)
  })
  it('rejeita localhost configurado em produção', () => {
    vi.stubEnv('PROD', true)
    vi.stubEnv('VITE_APP_URL', 'http://localhost:5173')
    expect(() => authRedirect('/login')).toThrow('localhost')
  })
})
