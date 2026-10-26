import { create } from 'zustand'

const useChoices = create<{ choices: Record<string, boolean>; save: (key: string, compact: boolean) => void }>((set) => ({
  choices: {},
  save: (key, compact) => {
    set((state) => ({ choices: { ...state.choices, [key]: compact } }))
    try { localStorage.setItem(key, compact ? 'compact' : 'expanded') } catch { /* Mantém a escolha nesta sessão. */ }
  },
}))

function load(key: string) {
  try { return localStorage.getItem(key) === 'compact' } catch { return false }
}

export function useSidebarPreference(userId?: string) {
  const key = `valora:sidebar:v1:${userId ?? 'guest'}`
  const { choices, save } = useChoices()
  const compact = choices[key] ?? load(key)
  return { compact, setCompact: (value: boolean) => save(key, value) }
}
