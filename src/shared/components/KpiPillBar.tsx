/**
 * KpiPillBar — faixa de KPIs horizontais scrolláveis estilo pill.
 * Usado em DesempenhoRentabilidade e outras telas.
 */
type KpiPillItem = {
  label: string
  value: string
  colorClass?: string
}

type KpiPillBarProps = {
  items: KpiPillItem[]
}

export function KpiPillBar({ items }: KpiPillBarProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex shrink-0 items-center gap-2.5 rounded-full border border-white/[0.08] bg-[#1B1B1B] px-4 py-2.5"
        >
          <span className="text-[11px] text-white/50 whitespace-nowrap">{item.label}</span>
          <span
            className={`text-[14px] font-semibold leading-tight whitespace-nowrap ${
              item.colorClass ?? 'text-white'
            }`}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  )
}
