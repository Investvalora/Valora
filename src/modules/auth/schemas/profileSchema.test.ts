import { expect, it } from 'vitest'
import { phoneSchema, profileSchema } from './profileSchema'

it.each(['abc!@#', '123456789012345678901234567890', '119999', '++5511999999999', '00000000000'])('rejeita telefone inválido %s', phone => {
  expect(phoneSchema.safeParse(phone).success).toBe(false)
})
it.each([['(11) 99999-9999', '11999999999'], ['(11) 3333-4444', '1133334444'], ['+55 (11) 99999-9999', '+5511999999999'], ['+1 202-555-0123', '+12025550123'], ['   ', '']])('normaliza telefone %s', (input, expected) => {
  expect(phoneSchema.parse(input)).toBe(expected)
})
it('normaliza nome sem remover espaços internos e permite remover telefone', () => {
  expect(profileSchema.parse({ fullName: '  Ana  Maria  ', phone: '' })).toEqual({ fullName: 'Ana  Maria', phone: '' })
  expect(profileSchema.safeParse({ fullName: '  ', phone: '' }).success).toBe(false)
})
