import { useEffect, useRef, useState } from 'react'
import type { MonthlyBar } from '../../dividends/types'
import { monthlyIncome } from '../../dividends/utils/monthlyIncome'

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
const monthLabel = (month: string) => `${month.slice(5, 7)}/${month.slice(0, 4)}`

export function ProventosChart({ bars, receivables = [], maxBars = 8 }: { bars: MonthlyBar[]; receivables?: MonthlyBar[]; maxBars?: number }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [position, setPosition] = useState({ left: 8, top: 8 })
  const container = useRef<HTMLDivElement>(null)
  const tooltip = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const dismiss = () => setSelected(null)
    window.addEventListener('resize', dismiss)
    return () => window.removeEventListener('resize', dismiss)
  }, [])
  function show(month: string, button: HTMLButtonElement, clientX?: number, clientY?: number) {
    const root = container.current?.getBoundingClientRect()
    if (!root) return
    const bar = button.getBoundingClientRect()
    const width = tooltip.current?.offsetWidth || Math.max(0, Math.min(230, root.width - 16))
    const height = tooltip.current?.offsetHeight || 240
    const x = (clientX ?? bar.left + bar.width / 2) - root.left
    const y = (clientY ?? bar.top + 8) - root.top
    const maxLeft = Math.max(8, Math.min(root.width - width - 8, window.innerWidth - root.left - width - 8))
    const left = x + width + 12 <= root.width ? x + 12 : x - width - 12
    setPosition({ left: Math.max(8, Math.min(left, maxLeft)), top: Math.max(8, Math.min(y + 12, root.height - height - 8)) })
    setSelected(month)
  }
  const visible = monthlyIncome(bars, receivables).slice(-maxBars)
  const active = visible.find(row => row.month === selected)
  const maximum = Math.max(1, ...visible.map(row => row.total))
  if (!visible.length) return <div className="flex h-[180px] items-center justify-center text-xs text-white/50">Sem proventos no período</div>
  return <div ref={container} className="relative" onMouseLeave={() => setSelected(null)}>
    <div className="overflow-x-auto pb-2" onScroll={() => setSelected(null)}>
      <div className="flex h-[220px] min-w-full gap-2 border-b border-white/10 bg-[repeating-linear-gradient(to_top,transparent,transparent_49px,rgba(255,255,255,0.06)_50px)]">
        {visible.map(row => <button key={row.month} type="button"
          aria-label={`${monthLabel(row.month)}: proventos a receber ${money(row.receivable)}, proventos recebidos ${money(row.received)}, total ${money(row.total)}`}
          aria-pressed={selected === row.month}
          onMouseEnter={event => show(row.month, event.currentTarget, event.clientX, event.clientY)}
          onMouseMove={event => show(row.month, event.currentTarget, event.clientX, event.clientY)}
          onFocus={event => show(row.month, event.currentTarget)}
          onBlur={() => setSelected(null)} onClick={event => show(row.month, event.currentTarget)} onKeyDown={event => { if (event.key === 'Escape') setSelected(null) }}
          className="flex min-w-[48px] flex-1 flex-col justify-end rounded-t-md px-1 outline-none hover:bg-blue-400/5 focus-visible:ring-2 focus-visible:ring-blue-400">
          <span className="flex h-[185px] w-full flex-col justify-end" aria-hidden="true">
            <span className="w-full rounded-t-[4px] bg-[#BFD5FA]" style={{ height: `${row.receivable / maximum * 95}%` }} />
            <span className={`w-full bg-[#477CDA] ${row.receivable === 0 ? 'rounded-t-[4px]' : ''}`} style={{ height: `${row.received / maximum * 95}%` }} />
          </span>
          <span className="py-2 text-[10px] text-white/60">{monthLabel(row.month)}</span>
        </button>)}
      </div>
    </div>
    {active && <div ref={tooltip} role="tooltip" style={position} className="pointer-events-none absolute z-10 w-[230px] max-w-[calc(100%_-_16px)] rounded-2xl border border-white/15 bg-[#242424] p-5 text-sm shadow-xl">
      <p className="mb-4 font-semibold text-white">{monthLabel(active.month)}</p>
      <p className="flex items-center gap-2 text-xs text-white/60"><span className="h-3 w-3 rounded-sm bg-[#BFD5FA]" />Proventos a receber</p>
      <p className="mb-3 mt-1 text-white">{money(active.receivable)}</p>
      <p className="flex items-center gap-2 text-xs text-white/60"><span className="h-3 w-3 rounded-sm bg-[#477CDA]" />Proventos recebidos</p>
      <p className="mb-3 mt-1 text-white">{money(active.received)}</p>
      <p className="border-t border-white/10 pt-3 text-xs text-white/60">Total</p>
      <p className="mt-1 font-semibold text-white">{money(active.total)}</p>
    </div>}
    <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[11px] text-white/60">
      <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#477CDA]" />Proventos recebidos</span>
      <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#BFD5FA]" />Proventos a receber</span>
    </div>
  </div>
}
