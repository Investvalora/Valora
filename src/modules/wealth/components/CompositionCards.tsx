import { useId } from 'react'
import { Tooltip } from '../../../shared/components/Tooltip'
import {
  assetClassColor,
  assetClassLabel,
  isInternationalClass,
} from '../../portfolio/composition'
import type { AssetClassSlice, CompositionSummary } from '../../portfolio/types'

/**
 * Cards de composição por classe e exposição internacional.
 *
 * Recebe a saída de `deriveComposition` diretamente — nenhuma lógica de
 * classificação vive aqui, conforme exigido pela spec (Boundaries & Constraints:
 * reutilizar `deriveComposition`, `assetClassLabel`, `assetClassColor` e
 * `isInternationalClass` sem duplicar).
 */

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const MISSING = '—'

function formatBRL(value: number): string {
  if (!Number.isFinite(value)) return MISSING
  return brlFormatter.format(value)
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return MISSING
  return `${percentFormatter.format(value)}%`
}

interface ClassSliceItemProps {
  slice: AssetClassSlice
}

function ClassSliceItem({ slice }: ClassSliceItemProps) {
  const color = assetClassColor(slice.type)
  const label = assetClassLabel(slice.type)

  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-dark-border pb-2 last:border-b-0 last:pb-0">
      <span className="flex items-center gap-2 text-sm font-medium text-gray-200">
        {/* Cor decorativa — rótulo textual carrega a informação. */}
        <span
          aria-hidden="true"
          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        {label}
        {isInternationalClass(slice.type) && (
          <span className="ml-1 rounded border border-sky-500/40 bg-sky-500/10 px-1 py-0.5 text-xs text-sky-300">
            internacional
          </span>
        )}
      </span>

      <Tooltip label={`Detalhes de ${label}`}>
        <span className="block font-semibold text-white">{label}</span>
        <span className="mt-1 block">Valor: {formatBRL(slice.valueBRL)}</span>
        <span className="block">Peso: {formatPercent(slice.percent)}</span>
        <span className="block">Maior posição: {slice.topTicker}</span>
      </Tooltip>

      <span className="text-sm text-gray-200">
        {formatBRL(slice.valueBRL)} · {formatPercent(slice.percent)}
      </span>

      <span className="w-full text-xs text-gray-400">Maior posição: {slice.topTicker}</span>
    </li>
  )
}

interface CompositionCardsProps {
  composition: CompositionSummary
  isLoading: boolean
  /** Indica que a taxa USD é fallback — exibe badge informativo. */
  usdRateIsFallback: boolean
}

export function CompositionCards({
  composition,
  isLoading,
  usdRateIsFallback,
}: CompositionCardsProps) {
  const headingId = useId()
  const internationalSlices = composition.slices.filter((s) => isInternationalClass(s.type))

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-lg border border-dark-border bg-dark-surface p-6"
    >
      <h2
        id={headingId}
        className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400"
      >
        Composição por classe
      </h2>

      {isLoading ? (
        <p className="text-sm text-gray-400">Carregando composição...</p>
      ) : composition.slices.length === 0 ? (
        <p className="text-sm text-gray-400">
          Nenhuma posição com cotação disponível para calcular a composição.
        </p>
      ) : (
        <>
          {/* Total e exposição internacional */}
          <div className="mb-4">
            <p className="text-2xl font-bold text-white">{formatBRL(composition.totalBRL)}</p>
            <p className="mt-1 text-sm text-gray-300">
              Exposição internacional:{' '}
              <span className="font-semibold text-white">
                {formatPercent(composition.internationalPercent)}
              </span>{' '}
              ({formatBRL(composition.internationalValueBRL)})
              {usdRateIsFallback && (
                <span className="ml-2 rounded-full border border-amber-400/50 bg-amber-400/10 px-2 py-0.5 text-xs font-medium text-amber-300">
                  taxa USD aproximada
                </span>
              )}
            </p>
          </div>

          {/* Lista de classes */}
          <ul aria-label="Classes de ativo da carteira" className="space-y-2">
            {composition.slices.map((slice) => (
              <ClassSliceItem key={slice.type} slice={slice} />
            ))}
          </ul>

          {/* Card de exposição internacional destacado quando há classes internacionais */}
          {internationalSlices.length > 0 && (
            <div className="mt-4 rounded-lg border border-sky-500/30 bg-sky-500/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-400">
                Exposição Internacional
              </p>
              <p className="mt-1 text-xl font-bold text-white">
                {formatPercent(composition.internationalPercent)}
              </p>
              <p className="text-sm text-gray-300">{formatBRL(composition.internationalValueBRL)}</p>

              <ul className="mt-3 space-y-1">
                {internationalSlices.map((slice) => (
                  <li key={slice.type} className="flex items-center justify-between text-sm">
                    <span
                      className="flex items-center gap-2 text-gray-300"
                    >
                      <span
                        aria-hidden="true"
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: assetClassColor(slice.type) }}
                      />
                      {assetClassLabel(slice.type)}
                    </span>
                    <span className="text-gray-200">
                      {formatPercent(slice.percent)} · ticker: {slice.topTicker}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  )
}
