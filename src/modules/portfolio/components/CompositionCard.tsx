import { Component, lazy, Suspense, useId, useMemo } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { assetClassColor, deriveComposition } from '../composition'
import type { PositionRow } from '../types'

/**
 * Card de composição por classe e exposição internacional.
 *
 * Apresentacional: recebe as linhas já derivadas pelo pai e delega toda a
 * aritmética a `deriveComposition`. As regras de classe vivem lá porque os
 * cards do Épico 3 as reusam — dentro do componente elas seriam invisíveis para
 * quem precisa reusá-las e inevitavelmente seriam reescritas.
 */

const CompositionPieChart = lazy(() => import('./CompositionPieChart'))

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

/** Lacuna honesta: um número que não pôde ser calculado não é zero. */
const MISSING = '—'

function formatBRL(value: number): string {
  if (!Number.isFinite(value)) return MISSING
  return brlFormatter.format(value)
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return MISSING
  return `${percentFormatter.format(value)}%`
}

/**
 * O gráfico é enriquecimento e falha sozinho: um chunk do Recharts que não baixa
 * (deploy novo, rede ruim) não pode derrubar a Carteira inteira nem levar embora
 * a legenda, que é onde os números acessíveis estão. A fronteira degrada para
 * nada visual e o resto do card segue de pé — a legenda vive fora dela.
 */
interface ChartErrorBoundaryProps {
  children: ReactNode
}

interface ChartErrorBoundaryState {
  hasError: boolean
}

class ChartErrorBoundary extends Component<ChartErrorBoundaryProps, ChartErrorBoundaryState> {
  constructor(props: ChartErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): ChartErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // `warn` e não `error`: a informação continua na tela, então isto é
    // degradação registrada, não falha do card.
    console.warn('Gráfico de composição não pôde ser renderizado.', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) return null

    return this.props.children
  }
}

interface CompositionCardProps {
  /** Linhas já derivadas pelo pai — `marketValueBRL` em BRL. */
  rows: PositionRow[]
  /** Total avaliado da carteira, em BRL, vindo da mesma derivação. */
  totalBRL: number
  /**
   * Cotações ou taxa USD em voo. `totalBRL === 0` acontece em dois estados
   * diferentes — ainda não chegou nada, ou chegou e nada serve — e só o segundo
   * autoriza dizer "nenhuma posição com cotação".
   */
  isQuotesLoading: boolean
  /**
   * Posições que o pai deixou fora do total. Vem de `derived.missingValueCount`
   * em vez de ser recontado aqui: recontar por `marketValueBRL === null` daria
   * um número diferente do card de patrimônio ao lado.
   */
  missingValueCount: number
}

export function CompositionCard({
  rows,
  totalBRL,
  isQuotesLoading,
  missingValueCount,
}: CompositionCardProps) {
  const headingId = useId()
  const composition = useMemo(() => deriveComposition(rows, totalBRL), [rows, totalBRL])

  // Sem posição nenhuma não há composição para mostrar — o mesmo critério do
  // card de patrimônio, que também não aparece numa carteira vazia.
  if (rows.length === 0) return null

  const hasComposition = composition.slices.length > 0

  return (
    <section
      // `aria-labelledby` aponta para o próprio título: um `aria-label` com o
      // mesmo texto duplicaria a string e a deixaria livre para divergir do
      // heading na próxima edição.
      aria-labelledby={headingId}
      className="mb-6 rounded-lg border border-dark-border bg-dark-surface p-6"
    >
      <h2
        id={headingId}
        className="text-xs font-semibold uppercase tracking-wide text-gray-400"
      >
        Composição por classe
      </h2>

      {!hasComposition ? (
        <>
          <p className="mt-1 text-3xl font-bold text-white">{MISSING}</p>
          <p className="mt-2 text-sm text-gray-400">
            {isQuotesLoading
              ? 'Carregando composição...'
              : 'Nenhuma posição com cotação disponível para calcular a composição.'}
          </p>
        </>
      ) : (
        <>
          <p className="mt-1 text-3xl font-bold text-white">
            {formatBRL(composition.totalBRL)}
          </p>

          <p className="mt-1 text-sm text-gray-300">
            Exposição internacional:{' '}
            <span className="font-semibold text-white">
              {formatPercent(composition.internationalPercent)}
            </span>{' '}
            ({formatBRL(composition.internationalValueBRL)})
          </p>

          <div className="mt-4 grid items-center gap-6 md:grid-cols-2">
            {/* Fora da árvore de acessibilidade: um leitor de tela não tem o que
                fazer com os `path`s da pizza, e a legenda ao lado carrega
                exatamente a mesma informação em texto. */}
            <div aria-hidden="true">
              <ChartErrorBoundary>
                <Suspense fallback={<div className="h-[220px]" />}>
                  <CompositionPieChart
                    slices={composition.slices}
                    formatBRL={formatBRL}
                    formatPercent={formatPercent}
                  />
                </Suspense>
              </ChartErrorBoundary>
            </div>

            <ul aria-label="Classes de ativo da carteira" className="space-y-2">
              {composition.slices.map((slice) => (
                <li
                  key={slice.type}
                  className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-dark-border pb-2 last:border-b-0 last:pb-0"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-gray-200">
                    {/* A cor é redundante com o rótulo — decorativa, portanto. */}
                    <span
                      aria-hidden="true"
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: assetClassColor(slice.type) }}
                    />
                    {slice.label}
                  </span>

                  <span className="text-sm text-gray-200">
                    {formatBRL(slice.valueBRL)} · {formatPercent(slice.percent)}
                  </span>

                  {/* O mesmo par que o tooltip da fatia mostra, alcançável sem
                      mouse e sem depender do SVG. */}
                  <span className="w-full text-xs text-gray-400">
                    Maior posição: {slice.topTicker}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {/* A ressalva é parte dos percentuais: uma composição que ignora posições
          sem cotação e não diz isso vira diversificação inventada. */}
      {missingValueCount > 0 && !isQuotesLoading && (
        <p className="mt-3 text-sm text-amber-300">
          {missingValueCount === 1
            ? '1 posição sem cotação disponível não entra na composição.'
            : `${missingValueCount} posições sem cotação disponível não entram na composição.`}
        </p>
      )}
    </section>
  )
}
