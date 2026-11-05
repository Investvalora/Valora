import { expect, it } from 'vitest'
import { signupSchema } from './signupSchema'

it('aplica no cadastro o mesmo limite de 120 caracteres do perfil', () => {
  const fields = { email: 'teste@example.com', password: 'Teste123!@', confirmPassword: 'Teste123!@' }
  expect(signupSchema.safeParse({ ...fields, fullName: 'A'.repeat(120) }).success).toBe(true)
  expect(signupSchema.safeParse({ ...fields, fullName: 'A'.repeat(121) }).success).toBe(false)
  expect(signupSchema.safeParse({ ...fields, fullName: 'A'.repeat(300) }).success).toBe(false)
})
