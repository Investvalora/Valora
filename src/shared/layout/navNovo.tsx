import { Home, Wallet, TrendingUp, Target } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavItem = {
  path: string
  label: string
  icon: LucideIcon
}

export const navItemsNovo: NavItem[] = [
  { path: '/novo/inicio',      label: 'Início',     icon: Home       },
  { path: '/novo/ativos',      label: 'Ativos',     icon: Wallet     },
  { path: '/novo/desempenho',  label: 'Desempenho', icon: TrendingUp },
  { path: '/novo/analise',     label: 'Análise',    icon: Target     },
]
