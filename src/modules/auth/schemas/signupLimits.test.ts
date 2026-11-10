import { profileSchema } from './profileSchema'
import { expect, it } from 'vitest'
import { signupSchema } from './signupSchema'

it('aplica no cadastro o mesmo limite de 120 caracteres do perfil', () => {
  const fields = { email: 'teste@example.com', password: 'Teste123!@', confirmPassword: 'Teste123!@' }
  expect(signupSchema.safeParse({ ...fields, fullName: 'A'.repeat(120) }).success).toBe(true)
  expect(signupSchema.safeParse({ ...fields, fullName: 'A'.repeat(121) }).success).toBe(false)
  expect(signupSchema.safeParse({ ...fields, fullName: 'A'.repeat(300) }).success).toBe(false)
})

it.each(['123456', '@@@', '   '])('rejeita nome sem letra no cadastro e no perfil: %s', fullName => {
  expect(signupSchema.safeParse({ fullName, email: 'teste@example.com', password: 'Teste123!@', confirmPassword: 'Teste123!@' }).success).toBe(false)
  expect(profileSchema.safeParse({ fullName, phone: '' }).success).toBe(false)
})
it.each(['João', 'Ana Maria', '李小明', 'Jean-Luc', 'Ana 123'])('preserva nomes diversos com ao menos uma letra: %s', fullName => {
  expect(profileSchema.parse({ fullName, phone: '' }).fullName).toBe(fullName)
})
