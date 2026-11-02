import { z } from 'zod'

export const phoneSchema = z.string().trim().max(30, 'Telefone muito longo')
  .refine(value => !value || /^[+\d\s().-]+$/.test(value), 'Informe somente números e a formatação do telefone')
  .transform(value => value.replace(/[\s().-]/g, ''))
  .refine(value => !value || (value.startsWith('+') ? /^\+[1-9]\d{7,14}$/.test(value) : /^[1-9]\d{9,10}$/.test(value)), 'Informe DDD e telefone (10 ou 11 dígitos), ou +DDI e número internacional')

export const profileSchema = z.object({
  fullName: z.string().trim().min(3, 'Nome completo deve ter no mínimo 3 caracteres').max(120, 'Nome muito longo'),
  phone: phoneSchema,
})
