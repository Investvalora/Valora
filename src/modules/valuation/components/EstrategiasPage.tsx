import { useMemo, useState } from 'react'
import { Tooltip } from '../../../shared/components/Tooltip'
import { usePositions } from '../../portfolio/hooks/usePositions'
import { useHasPositions } from '../../dividends/hooks/useDividends'
import { useBazin } from '../hooks/useBazin'
import { sortBazinResults } from '../utils/bazinCalculation'
import type { BazinResult } from '../types'

// ─── formatadores ─────────────────────────────────────────────────────────────

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
})

const MISSING = '—'

function formatBRL(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return MISSING
  return brlFormatter.format(value)
}

function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return MISSING
  return `${percentFormatter.format(value)}%`
}

// ─── sub-componentes ──────────────────────────────────────────────────────────

function MarginIndicator({ margin }: { margin: number | null }) {
  if (margin === null) return <span className="text-gray-500">{MISSING}</span>

  const isOpportunity = margin > 0
  const color = isOpportunity ? 'text-green-400' : 'text-red-400'
  const icon = isOpportunity ? '▲' : '▼'
  const label = isOpportunity
    ? `${formatPercent(margin)} acima do teto`
    : `${formatPercent(margin)} abaixo do teto`

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold ${color}`}
      aria-label={label}
    >
      <span aria-hidden="true">{icon}</span>
      {formatPercent(margin)}
    </span>
  )
}

// ─── células N/A com tooltip ──────────────────────────────────────────────────

const NA_TOOLTIP_CONTENT = (
  <>
    <span className="block font-semibold text-white">Sem dados</span>
    <span className="mt-1 block text-gray-300 text-xs">
      Não há dividendos registrados para este ativo nos últimos 12 meses. O
      cálculo Bazin exige pelo menos um provento no período.
    </span>
  </>
)

function NaCell({ ticker }: { ticker: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-gray-500">N/A</span>
      <Tooltip label={`Ausência de dados para ${ticker}`}>
        {NA_TOOLTIP_CONTENT}
      </Tooltip>
    </span>
  )
}

// ─── linha da tabela ──────────────────────────────────────────────────────────

function BazinRow({ result }: { result: BazinResult }) {
  const CELL = 'px-4 py-3 text-sm text-gray-200'
  const CELL_RIGHT = `${CELL} text-right`

  return (
    <tr className="border-t border-dark-border hover:bg-dark-surface/50 transition-colors">
      <th scope="row" className={`${CELL} font-semibold text-white text-left`}>
        {result.ticker}
      </th>

      {/* Dividendo 12M */}
      <td className={CELL_RIGHT}>
        {result.hasData ? formatBRL(result.annualDividend) : <NaCell ticker={result.ticker} />}
      </td>

      {/* Cotação atual */}
      <td className={CELL_RIGHT}>{formatBRL(result.currentPrice)}</td>

      {/* Preço-Teto */}
      <td className={CELL_RIGHT}>
        {result.ceilingPrice !== null ? formatBRL(result.ceilingPrice) : (
          result.hasData ? MISSING : <NaCell ticker={result.ticker} />
        )}
      </td>

      {/* Margem */}
      <td className={CELL_RIGHT}>
        {result.hasData ? (
          <MarginIndicator margin={result.margin} />
        ) : (
          <NaCell ticker={result.ticker} />
        )}
      </td>
    </tr>
  )
}

// ─── página principal ─────────────────────────────────────────────────────────

export function EstrategiasPage() {
  const [minDYPct, setMinDYPct] = useState<number>(6)
  const [inputError, setInputError] = useState<string>('')
  // effectiveDY é derivado de minDYPct — os dois nunca divergem.
  const effectiveDY = minDYPct > 0 && minDYPct <= 100 ? minDYPct / 100 : 0.06

  const { data: positions = [], isLoading: positionsLoading } = usePositions()
  const { hasPositions, isLoading: hasPositionsLoading } = useHasPositions()

  const tickers = useMemo(() => positions.map((p) => p.ticker), [positions])

  const { bazinByTicker, isLoading: bazinLoading, isError, refetch } = useBazin(
    tickers,
    effectiveDY,
  )

  // Resultados como array ordenado — memoizado para não reordenar a cada render do input.
  const sortedResults = useMemo(
    () => sortBazinResults(Array.from(bazinByTicker.values())),
    [bazinByTicker],
  )

  function handleDYChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    const parsed = parseFloat(raw)

    setMinDYPct(isNaN(parsed) ? 0 : parsed)

    if (raw === '' || isNaN(parsed)) {
      setInputError('Informe um valor numérico para o DY mínimo.')
      return
    }
    if (parsed <= 0) {
      setInputError('DY mínimo deve ser maior que zero.')
      return
    }
    if (parsed > 100) {
      setInputError('DY mínimo não pode ser maior que 100%.')
      return
    }

    setInputError('')
    setMinDYPct(parsed)
  }

  const isLoading = positionsLoading || hasPositionsLoading || bazinLoading

  // ── Estado: carregando ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white mb-6">Estratégias</h1>
        <p className="text-gray-400 animate-pulse">Carregando dados…</p>
      </div>
    )
  }

  // ── Estado: erro ────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white mb-6">Estratégias</h1>
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 flex flex-col gap-3"
        >
          <p className="text-red-400 font-medium">Erro ao carregar dados de dividendos ou cotações.</p>
          <button
            type="button"
            onClick={refetch}
            className="self-start rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium px-4 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  // ── Estado: sem posições ────────────────────────────────────────────────────
  if (!hasPositions) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white mb-6">Estratégias</h1>
        <div className="rounded-xl border border-dark-border bg-dark-surface p-10 text-center">
          <p className="text-gray-400 text-lg">Nenhuma posição cadastrada</p>
          <p className="text-gray-500 text-sm mt-2">
            Adicione ativos na Carteira para visualizar o Preço-Teto Bazin.
          </p>
        </div>
      </div>
    )
  }

  // ── Tela completa ────────────────────────────────────────────────────────────
  return (
    <div className="p-8 flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Estratégias</h1>
        <p className="text-gray-400 text-sm">
          Preço-teto pelo método Bazin: Dividendo anual por ação ÷ DY mínimo desejado.
        </p>
      </div>

      {/* Controle de DY mínimo */}
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-dark-border bg-dark-surface px-6 py-5">
        <div>
          <label
            htmlFor="min-dy"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            DY mínimo desejado (%)
          </label>
          <div className="flex items-center gap-2">
            <input
              id="min-dy"
              type="number"
              step="0.5"
              min="0.1"
              max="100"
              value={minDYPct || ''}
              onChange={handleDYChange}
              aria-invalid={!!inputError}
              aria-describedby={inputError ? 'min-dy-error' : undefined}
              className="w-28 px-3 py-2 rounded-lg border border-dark-border bg-dark-bg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-gray-400 text-sm">%</span>
          </div>
          {inputError && (
            <p id="min-dy-error" className="mt-1 text-xs text-red-400" role="alert">
              {inputError}
            </p>
          )}
        </div>

        <div className="text-sm text-gray-400">
          <p>
            Preço-teto ={' '}
            <span className="text-white font-mono">
              Dividendo 12M ÷ {(effectiveDY * 100).toFixed(1)}%
            </span>
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            {sortedResults.filter((r) => r.hasData && r.margin !== null && r.margin > 0).length} ativo(s) abaixo do teto ·{' '}
            {sortedResults.filter((r) => r.hasData && r.margin !== null && r.margin <= 0).length} acima
          </p>
        </div>
      </div>

      {/* Tabela */}
      {sortedResults.length === 0 ? (
        <div className="rounded-xl border border-dashed border-dark-border p-10 text-center">
          <p className="text-gray-400">Nenhum dado de preço-teto disponível para a carteira atual.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-dark-border">
          <table className="w-full border-collapse">
            <caption className="sr-only">Preço-Teto Bazin por ativo da carteira</caption>
            <thead className="bg-dark-bg">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Ticker
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Dividendo 12M (R$/ação)
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Cotação atual
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Preço-Teto Bazin
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Margem
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedResults.map((result) => (
                <BazinRow key={result.ticker} result={result} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
