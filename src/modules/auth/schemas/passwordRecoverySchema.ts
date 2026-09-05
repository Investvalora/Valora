import { z } from 'zod'

export const passwordRecoverySchema = z.object({
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido'),
})

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres'),
  confirmPassword: z
    .string()
    .min(1, 'Confirme sua nova senha'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não conferem',
  path: ['confirmPassword'],
})

export type PasswordRecoverySchema = z.infer<typeof passwordRecoverySchema>
export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>
