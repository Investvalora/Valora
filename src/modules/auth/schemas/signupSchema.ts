import { z } from 'zod'

export const signupSchema = z.object({
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido'),
  password: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres'),
  fullName: z
    .string()
    .min(3, 'Nome completo deve ter no mínimo 3 caracteres'),
  phone: z
    .string()
    .optional(),
})

export type SignupSchema = z.infer<typeof signupSchema>
