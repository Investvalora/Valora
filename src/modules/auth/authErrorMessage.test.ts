import { expect, it } from 'vitest'
import { recoveryErrorMessage } from './authErrorMessage'

it('orienta sobre sessão ausente, rede, limite e senha repetida sem expor erros brutos', () => {
  expect(recoveryErrorMessage(new Error('Auth session missing!'), true)).toContain('Solicite um novo link')
  expect(recoveryErrorMessage(new Error('Failed to fetch'))).toContain('Verifique sua conexão')
  expect(recoveryErrorMessage(new Error('rate limit exceeded'))).toContain('Aguarde')
  expect(recoveryErrorMessage(new Error('New password should be different from the old password.'), true)).toContain('diferente')
  expect(recoveryErrorMessage(new Error('unexpected provider details'))).not.toContain('provider')
})
