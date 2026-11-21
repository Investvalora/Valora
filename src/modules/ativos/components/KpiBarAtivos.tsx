import { ChartPie, ChevronRight } from 'lucide-react'
import { InformationHelp } from '../../../shared/components/InformationHelp'

type KpiBarAtivosProps = {
  patrimonio: string
  valorInvestido: string
  ganhoCapital: string
  ganhoCapitalPositive: boolean | null
  ativos: number
  onResumo: () => void
}

/** Indicadores horizontais, seguidos pelo botão de resumo completo. */
export function KpiBarAtivos({ patrimonio, valorInvestido, ganhoCapital, ganhoCapitalPositive, ativos, onResumo }: KpiBarAtivosProps) {
  const ganhoColor = ganhoCapitalPositive === null ? 'text-white' : ganhoCapitalPositive ? 'text-nf-green' : 'text-nf-pink'
  const metrics = [
    { label: 'Patrimônio total', value: patrimonio, help: true },
    { label: 'Valor investido', value: valorInvestido },
    { label: 'Ganho de capital', value: ganhoCapital, color: ganhoColor },
    { label: 'Ativos', value: ativos },
  ]

  return (
    <div className="min-w-0 md:rounded-xl md:border md:border-white/[0.08] md:bg-[#1A1A1A]">
      <div role="region" aria-label="Indicadores da carteira" tabIndex={0}
        className="-mx-4 min-w-0 overflow-x-auto overscroll-x-contain px-4 [scrollbar-width:none] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/40 md:mx-0 md:flex-1 md:px-0 [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-3 pb-1 md:gap-0 md:px-2 md:py-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="flex shrink-0 flex-col justify-between gap-1 rounded-xl bg-[#1A1A1A] px-4 py-3 md:flex-1 md:rounded-none md:bg-transparent md:py-0 md:[&:not(:last-child)]:border-r md:border-white/[0.08]">
              <div className="flex min-h-9 items-center justify-between gap-3">
                <span className="whitespace-nowrap text-[11px] text-white/55">{metric.label}</span>
                {metric.help && <InformationHelp topic="balance" />}
              </div>
              <span className={`whitespace-nowrap text-lg font-medium leading-tight tabular-nums ${metric.color ?? 'text-white'}`}>{metric.value}</span>
            </div>
          ))}
          <div className="flex shrink-0 items-center px-1 md:px-4">
            <button type="button" onClick={onResumo} aria-haspopup="dialog"
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-white/[0.08] px-3 text-xs font-medium text-white/90 transition-colors hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
              <ChartPie size={15} aria-hidden="true" />
              Resumo completo
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
