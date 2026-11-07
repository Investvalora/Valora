import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { loginThrottle } from './loginThrottle'

beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); loginThrottle.success(); loginThrottle.finish() })
afterEach(() => vi.useRealTimers())
const invalid = { code: 'invalid_credentials' }

it('aplica espera progressiva, persiste sem credenciais e reinicia após sucesso', () => {
  loginThrottle.failure(invalid)
  expect(loginThrottle.remaining()).toBe(2)
  expect(() => loginThrottle.begin()).toThrow('Aguarde 2s')
  vi.advanceTimersByTime(2000)
  loginThrottle.begin(); loginThrottle.finish(); loginThrottle.failure(invalid)
  expect(loginThrottle.remaining()).toBe(4)
  expect(localStorage.getItem('valora:login-backoff:v1')).not.toContain('email')
  loginThrottle.success()
  expect(loginThrottle.remaining()).toBe(0)
})

it('bloqueia chamadas simultâneas e não pune erro de rede', () => {
  loginThrottle.begin()
  expect(() => loginThrottle.begin()).toThrow('em andamento')
  loginThrottle.finish(); loginThrottle.failure(new Error('Network error'))
  expect(loginThrottle.remaining()).toBe(0)
})

it('respeita 429 por 60 segundos e expira o contador após 15 minutos', () => {
  loginThrottle.failure({ status: 429 })
  expect(loginThrottle.remaining()).toBe(60)
  vi.advanceTimersByTime(15 * 60_000 + 1)
  loginThrottle.failure(invalid)
  expect(loginThrottle.remaining()).toBe(2)
})

it('continua funcionando com armazenamento indisponível', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
  loginThrottle.failure(invalid)
  expect(loginThrottle.remaining()).toBe(2)
})
