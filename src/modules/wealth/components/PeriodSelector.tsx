import type { WealthPeriod } from '../types'

const PERIODS: WealthPeriod[] = ['1M', '3M', '6M', '1A', 'Tudo']

interface PeriodSelectorProps {
  value: WealthPeriod
  onChange: (period: WealthPeriod) => void
}

/**
 * Seletor de período reutilizável (Story 3.2, 3.3, Épico 4).
 *
 * Acessível: `role="group"` agrupa os botões logicamente; cada botão usa
 * `aria-pressed` para comunicar o estado selecionado a leitores de tela.
 */
export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div
      role="group"
      aria-label="Selecionar período"
      className="inline-flex rounded-lg border border-dark-border bg-dark-bg p-1 gap-1"
    >
      {PERIODS.map((period) => {
        const isActive = period === value

        return (
          <button
            key={period}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(period)}
            className={`
              rounded px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
              ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-dark-surface hover:text-gray-200'
              }
            `}
          >
            {period}
          </button>
        )
      })}
    </div>
  )
}
