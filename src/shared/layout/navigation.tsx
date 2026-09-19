import { Bell, ChartLine, Coins, FileText, SlidersHorizontal, Target, TrendingUp, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavigationItem = {
  path: string
  label: string
  icon: LucideIcon
}

export const navigationItems: NavigationItem[] = [
  { path: '/carteira', label: 'Carteira', icon: Wallet },
  { path: '/lancamentos', label: 'Lançamentos', icon: FileText },
  { path: '/patrimonio', label: 'Patrimônio', icon: ChartLine },
  { path: '/proventos', label: 'Proventos', icon: Coins },
  { path: '/rentabilidade', label: 'Rentabilidade', icon: TrendingUp },
  { path: '/score', label: 'Score', icon: Target },
  { path: '/estrategias', label: 'Estratégias', icon: SlidersHorizontal },
  { path: '/alertas', label: 'Alertas', icon: Bell },
]
