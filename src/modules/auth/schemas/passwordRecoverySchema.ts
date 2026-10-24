import { z } from 'zod'
import { passwordSchema } from './passwordSchema'

export const passwordRecoverySchema = z.object({
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido'),
})

export const resetPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z
    .string()
    .min(1, 'Confirme sua nova senha'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não conferem',
  path: ['confirmPassword'],
})

export type PasswordRecoverySchema = z.infer<typeof passwordRecoverySchema>
export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>
