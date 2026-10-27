import { ChevronDown, Layers } from 'lucide-react'
import { fmtMoney, fmtPct } from '../utils/fmt'

type Props = { label: string; color?: string; count: number; balance: number | null; weight: number | null; returnPercent?: number | null; expanded: boolean; onToggle: () => void }

export function AssetTableHeader({ label, color = '#f5cd80', count, balance, weight, returnPercent, expanded, onToggle }: Props) {
  return <button type="button" aria-label={`${expanded ? 'Recolher' : 'Expandir'} ${label}`} aria-expanded={expanded} onClick={onToggle}
    className="flex w-full items-center gap-4 px-5 py-5 text-left md:px-7">
    <Layers aria-hidden="true" className="h-7 w-7 shrink-0" style={{ color }} />
    <span className="mr-auto text-base font-semibold text-white">{label}</span>
    <span className="hidden min-w-20 text-center text-xs text-white/45 md:block">Ativos<span className="mt-1 block text-sm text-white/85">{count}</span></span>
    <span className="min-w-28 text-right text-xs text-white/45">Valor total<span className="mt-1 block text-sm font-medium tabular-nums text-white/85">{fmtMoney(balance)}</span></span>
    {returnPercent !== undefined && <span className="hidden min-w-32 text-right text-xs text-white/45 lg:block">Rentabilidade de capital<span className={`mt-1 block text-sm tabular-nums ${returnPercent === null ? 'text-white/60' : returnPercent >= 0 ? 'text-nf-green' : 'text-nf-pink'}`}>{fmtPct(returnPercent)}</span></span>}
    <span className="hidden min-w-28 text-right text-xs text-white/45 sm:block">% na carteira<span className="mt-1 block text-sm tabular-nums text-white/85">{weight === null ? '—' : `${weight.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`}</span></span>
    <span className="ml-2 rounded-full bg-white/5 p-2"><ChevronDown aria-hidden="true" className={`h-4 w-4 text-white/60 transition-transform ${expanded ? 'rotate-180' : ''}`} /></span>
  </button>
}
