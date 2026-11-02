import { z } from 'zod'
import { passwordSchema } from './passwordSchema'
import { phoneSchema } from './profileSchema'

export const signupSchema = z.object({
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido'),
  password: passwordSchema,
  fullName: z
    .string()
    .trim()
    .min(3, 'Nome completo deve ter no mínimo 3 caracteres'),
  phone: phoneSchema.optional(),
  confirmPassword: z.string().min(1, 'Confirme sua senha'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não conferem',
  path: ['confirmPassword'],
})

export type SignupSchema = z.infer<typeof signupSchema>
