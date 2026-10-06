import type { LucideIcon } from 'lucide-react'
import { TrendingUp } from 'lucide-react'

type KpiCardProps = {
  label: string
  value: string
  valueColor?: string       // classe tailwind ex: 'text-nf-green'
  icon: LucideIcon
  sub?: { label: string; value: string; valueColor?: string }[]
  arrowUp?: boolean
  className?: string
}

export function KpiCard({
  label,
  value,
  valueColor = 'text-white',
  icon: Icon,
  sub,
  arrowUp,
  className = '',
}: KpiCardProps) {
  return (
    <div
      className={`
        flex flex-1 flex-col gap-2 rounded-xl
        border border-white/[0.08]
        px-[18px] py-3
        ${className}
      `}
    >
      {/* Label + ícone */}
      <div className="flex items-center gap-2">
        <Icon className="h-[13px] w-[13px] shrink-0 text-[#8F8F8F]" strokeWidth={1.8} aria-hidden="true" />
        <span className="text-[12px] text-[#8F8F8F]">{label}</span>
      </div>

      {/* Valor principal */}
      <div className="flex items-center gap-1.5">
        <span className={`text-[22px] font-medium leading-none ${valueColor}`}>
          {value}
        </span>
        {arrowUp && (
          <TrendingUp
            className="h-3.5 w-3.5 text-nf-green"
            strokeWidth={2}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Sub-linhas */}
      {sub && sub.length > 0 && (
        <div className="flex flex-wrap gap-x-5 gap-y-0.5">
          {sub.map((s) => (
            <div key={s.label} className="flex flex-col gap-0.5">
              <span className="text-[10.5px] text-[#8F8F8F]">{s.label}</span>
              <span
                className={`text-[12px] font-medium ${
                  s.valueColor ?? 'text-white'
                }`}
              >
                {s.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
