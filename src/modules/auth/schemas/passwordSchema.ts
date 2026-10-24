import { z } from 'zod'

export const PASSWORD_HELP = 'Use de 8 a 256 caracteres, com maiúsculas, minúsculas, números e símbolos. Evite senhas comuns e sequências.'

// Adaptação autorizada: quatro categorias, como configurado no Supabase.
// A lista global de senhas banidas da Microsoft não é reproduzida aqui.
const commonWords = ['password', 'senha', 'qwerty', '123456', 'abcdef', 'admin', 'valora', 'welcome', 'letmein']

export const passwordSchema = z.string()
  .min(8, 'Senha deve ter no mínimo 8 caracteres')
  .max(256, 'Senha deve ter no máximo 256 caracteres')
  .regex(/^[\x20-\x7e]+$/, 'Use letras sem acentos, números, símbolos ou espaços')
  .refine((value) => [/[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9\s]/]
    .every((pattern) => pattern.test(value)),
  'Inclua maiúsculas, minúsculas, números e símbolos')
  .refine((value) => {
    const normalized = value.toLowerCase().replace(/[@4]/g, 'a').replace(/[0]/g, 'o')
      .replace(/[!1]/g, 'i').replace(/[$5]/g, 's').replace(/[3]/g, 'e')
    return !commonWords.some((word) => normalized.includes(word) || value.toLowerCase().includes(word)) &&
      !/(.)\1{3}/.test(value.toLowerCase()) && !/^(.{1,4})\1+$/.test(value.toLowerCase())
  }, 'Escolha uma senha menos previsível, sem palavras comuns, sequências ou repetições')
