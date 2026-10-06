import { Home, Wallet, TrendingUp, Target } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavItem = {
  path: string
  label: string
  icon: LucideIcon
}

export const navItemsNovo: NavItem[] = [
  { path: '/inicio',     label: 'Início',     icon: Home       },
  { path: '/ativos',     label: 'Ativos',     icon: Wallet     },
  { path: '/desempenho', label: 'Desempenho', icon: TrendingUp },
  { path: '/analise',    label: 'Análise',    icon: Target     },
]
