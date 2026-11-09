import type { WealthPeriod } from '../types'

const DEFAULT_PERIODS: WealthPeriod[] = ['1M', '3M', '6M', '1A', 'Tudo']

interface PeriodSelectorProps<T extends string> {
  value: T
  onChange: (period: T) => void
  fullWidthOnMobile?: boolean
  /**
   * Subconjunto de períodos a exibir.
   * Quando omitido, exibe todos os períodos disponíveis.
   * O valor de `value` deve pertencer ao subconjunto fornecido.
   */
  periods?: T[]
}

/**
 * Seletor de período reutilizável (Story 3.2, 3.3, Épico 4).
 *
 * Acessível: `role="group"` agrupa os botões logicamente; cada botão usa
 * `aria-pressed` para comunicar o estado selecionado a leitores de tela.
 */
export function PeriodSelector<T extends string = WealthPeriod>({ value, onChange, periods, fullWidthOnMobile = false }: PeriodSelectorProps<T>) {
  return (
    <div
      role="group"
      aria-label="Selecionar período"
      className={`inline-flex gap-1 rounded-xl border border-white/[0.08] bg-white/[0.04] p-1 ${fullWidthOnMobile ? 'w-full sm:w-auto' : ''}`}
    >
      {(periods ?? DEFAULT_PERIODS as T[]).map((period) => {
        const isActive = period === value

        return (
          <button
            key={period}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(period)}
            className={`
              min-h-9 rounded-lg py-1.5 text-sm font-medium transition-[background-color,color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-purple
              ${fullWidthOnMobile ? 'min-w-0 flex-1 px-1 sm:flex-none sm:px-3' : 'px-3'}
              ${
                isActive
                  ? 'bg-[#393939] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                  : 'text-white/50 hover:bg-white/[0.07] hover:text-white/[0.85]'
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
