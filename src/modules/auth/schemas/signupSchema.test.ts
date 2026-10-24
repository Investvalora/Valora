import { describe, expect, it } from 'vitest'
import { signupSchema } from './signupSchema'
import { passwordSchema } from './passwordSchema'
import { resetPasswordSchema } from './passwordRecoverySchema'

const valid = { fullName: '  Ana  Maria  ', email: 'ana@example.com', password: 'Brisa!Rio82', confirmPassword: 'Brisa!Rio82' }

describe('cadastro e política de senha', () => {
  it('rejeita nomes em branco e preserva os espaços internos', () => {
    expect(signupSchema.safeParse({ ...valid, fullName: '   ' }).success).toBe(false)
    expect(signupSchema.parse(valid).fullName).toBe('Ana  Maria')
  })
  it('exige confirmação idêntica', () => {
    expect(signupSchema.safeParse({ ...valid, confirmPassword: '' }).success).toBe(false)
    expect(signupSchema.safeParse({ ...valid, confirmPassword: 'Outra!Rio82' }).success).toBe(false)
  })
  it.each(['abcdefgh', '12345678', 'Password1!', 'Senha123!', 'Qwerty123!', 'Ab1!Ab1!', 'AAAAaaaa1!', 'Valora123!'])('rejeita senha previsível: %s', (password) => {
    expect(passwordSchema.safeParse(password).success).toBe(false)
    expect(resetPasswordSchema.safeParse({ password, confirmPassword: password }).success).toBe(false)
  })
  it.each(['BrisaRio82', 'brisa!rio82', 'BRISA!RIO82', 'Brisa!Rio', 'Brisa Rio82'])('rejeita quando falta uma das quatro categorias: %s', (password) => {
    expect(passwordSchema.safeParse(password).success).toBe(false)
    expect(resetPasswordSchema.safeParse({ password, confirmPassword: password }).success).toBe(false)
  })
  it.each(['Brisa!Rio82', ' Brisa!Rio82 '])('aceita quatro categorias: %s', (password) => {
    expect(passwordSchema.safeParse(password).success).toBe(true)
  })
  it('respeita comprimento e caracteres permitidos pelo Entra', () => {
    expect(passwordSchema.safeParse('Ab1!xy').success).toBe(false)
    expect(passwordSchema.safeParse('Brisa!'.repeat(43)).success).toBe(false)
    expect(passwordSchema.safeParse('Brísa!Rio82').success).toBe(false)
    expect(passwordSchema.parse(' Brisa!Rio82 ')).toBe(' Brisa!Rio82 ')
  })
})
