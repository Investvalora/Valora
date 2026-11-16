import type { User } from '@supabase/supabase-js'

const sessionChoices = new Map<string, 'pending' | 'completed'>()
const key = (id: string) => `valora:first-access:${id}`

function readChoice(id: string) {
  try { return sessionChoices.get(id) ?? localStorage.getItem(key(id)) }
  catch { return sessionChoices.get(id) }
}

export function saveFirstAccess(id: string, choice: 'pending' | 'completed') {
  sessionChoices.set(id, choice)
  try { localStorage.setItem(key(id), choice) }
  catch { /* Preserva a escolha até recarregar quando o armazenamento está indisponível. */ }
}

export function shouldShowFirstAccess(user: User | null) {
  if (!user) return false
  const choice = readChoice(user.id)
  if (choice === 'completed') return false
  if (choice === 'pending' || user.user_metadata?.valora_first_access === true) return true

  // O cadastro via Google também passa pela rota de login. A primeira
  // autenticação cria a conta e registra o acesso praticamente juntos.
  if (user.app_metadata?.provider !== 'google') return false
  const created = Date.parse(user.created_at)
  const signedIn = Date.parse(user.last_sign_in_at ?? '')
  const age = Date.now() - created
  return age >= 0 && age < 60 * 60_000 && signedIn >= created && signedIn - created < 60_000
}
