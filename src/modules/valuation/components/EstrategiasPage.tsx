import { useMemo, useState } from 'react'
import { Tooltip } from '../../../shared/components/Tooltip'
import { usePositions } from '../../portfolio/hooks/usePositions'
import { useHasPositions } from '../../dividends/hooks/useDividends'
import { useBazin } from '../hooks/useBazin'
import { useGraham } from '../hooks/useGraham'
import { sortBazinResults } from '../utils/bazinCalculation'
import type { AssetCurrency } from '../../portfolio/types'
import type { BazinResult, GrahamResult } from '../types'

// ─── tipos ────────────────────────────────────────────────────────────────────

type StrategyId = 'bazin' | 'graham'

interface Strategy {
  id: StrategyId
  label: string
  description: string
}

const STRATEGIES: Strategy[] = [
  {
    id: 'bazin',
    label: 'Bazin',
    description: 'Preço-teto = Dividendo anual por ação ÷ DY mínimo desejado.',
  },
  {
    id: 'graham',
    label: 'Graham',
    description: 'Preço justo = √(22,5 × LPA × VPA). Margem de segurança sobre a cotação atual.',
  },
]

// ─── formatadores ─────────────────────────────────────────────────────────────

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const decimalFormatter = new Intl.NumberFormat('pt-BR', {
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

/** Formata número sem símbolo de moeda — usado para LPA/VPA de ativos USD. */
function formatDecimal(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return MISSING
  return decimalFormatter.format(value)
}

function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return MISSING
  return `${percentFormatter.format(value)}%`
}

// ─── componentes compartilhados ───────────────────────────────────────────────

function MarginIndicator({ margin, positiveLabel, negativeLabel }: {
  margin: number | null
  positiveLabel?: string
  negativeLabel?: string
}) {
  if (margin === null) return <span className="text-gray-500">{MISSING}</span>

  const isOpportunity = margin > 0
  const color = isOpportunity ? 'text-green-400' : 'text-red-400'
  const icon = isOpportunity ? '▲' : '▼'
  const ariaLabel = isOpportunity
    ? `${formatPercent(margin)} ${positiveLabel ?? 'acima'}`
    : `${formatPercent(margin)} ${negativeLabel ?? 'abaixo'}`

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold ${color}`}
      aria-label={ariaLabel}
    >
      <span aria-hidden="true">{icon}</span>
      {formatPercent(margin)}
    </span>
  )
}

function NaCell({ ticker, reason }: { ticker: string; reason: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-gray-500">N/A</span>
      <Tooltip label={`Ausência de dados para ${ticker}`}>
        <>
          <span className="block font-semibold text-white">Sem dados</span>
          <span className="mt-1 block text-gray-300 text-xs">{reason}</span>
        </>
      </Tooltip>
    </span>
  )
}

/** Badge exibido quando a taxa USD/BRL veio de cache ou constante. */
function USDFallbackBadge() {
  return (
    <Tooltip label="Taxa USD/BRL aproximada">
      <>
        <span className="block font-semibold text-white">Taxa USD/BRL aproximada</span>
        <span className="mt-1 block text-gray-300 text-xs">
          Não foi possível obter a cotação atualizada do dólar. Os valores em BRL
          para ativos USD foram calculados com uma taxa estimada e podem estar
          ligeiramente desatualizados.
        </span>
      </>
    </Tooltip>
  )
}

// ─── tabs de estratégia ───────────────────────────────────────────────────────

function StrategyTabs({
  active,
  onChange,
}: {
  active: StrategyId
  onChange: (id: StrategyId) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="Estratégias de valuation"
      className="flex gap-1 rounded-xl border border-dark-border bg-dark-surface p-1 w-fit"
    >
      {STRATEGIES.map((s) => {
        const isActive = s.id === active
        return (
          <button
            key={s.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${s.id}`}
            id={`tab-${s.id}`}
            type="button"
            onClick={() => onChange(s.id)}
            className={[
              'px-5 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
              isActive
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-400 hover:text-white hover:bg-dark-bg',
            ].join(' ')}
          >
            {s.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── seção Bazin ──────────────────────────────────────────────────────────────

const BAZIN_NA_REASON =
  'Não há dividendos registrados para este ativo nos últimos 12 meses. O cálculo Bazin exige pelo menos um provento no período.'

function BazinRow({ result }: { result: BazinResult }) {
  const CELL = 'px-4 py-3 text-sm text-gray-200'
  const CELL_RIGHT = `${CELL} text-right`

  return (
    <tr className="border-t border-dark-border hover:bg-dark-surface/50 transition-colors">
      <th scope="row" className={`${CELL} font-semibold text-white text-left`}>
        <span className="flex items-center gap-2">
          {result.ticker}
          {result.currency === 'USD' && (
            <span className="text-xs text-gray-500 font-normal">USD→BRL</span>
          )}
        </span>
      </th>
      <td className={CELL_RIGHT}>
        {result.hasData
          ? formatBRL(result.annualDividend)
          : <NaCell ticker={result.ticker} reason={BAZIN_NA_REASON} />}
      </td>
      <td className={CELL_RIGHT}>{formatBRL(result.currentPrice)}</td>
      <td className={CELL_RIGHT}>
        {result.ceilingPrice !== null
          ? formatBRL(result.ceilingPrice)
          : result.hasData
            ? MISSING
            : <NaCell ticker={result.ticker} reason={BAZIN_NA_REASON} />}
      </td>
      <td className={CELL_RIGHT}>
        {result.hasData
          ? <MarginIndicator margin={result.margin} positiveLabel="abaixo do teto" negativeLabel="acima do teto" />
          : <NaCell ticker={result.ticker} reason={BAZIN_NA_REASON} />}
      </td>
    </tr>
  )
}

interface BazinSectionProps {
  tickers: string[]
  currencyByTicker: Map<string, AssetCurrency>
}

function BazinSection({ tickers, currencyByTicker }: BazinSectionProps) {
  const [minDYPct, setMinDYPct] = useState<number>(6)
  const [inputError, setInputError] = useState<string>('')

  const effectiveDY = minDYPct > 0 && minDYPct <= 100 ? minDYPct / 100 : 0.06

  const { bazinByTicker, isLoading, isError, isUSDRateFallback, refetch } = useBazin(
    tickers,
    effectiveDY,
    currencyByTicker,
  )

  const sortedResults = useMemo(
    () => sortBazinResults(Array.from(bazinByTicker.values())),
    [bazinByTicker],
  )

  const hasUSD = useMemo(
    () => [...currencyByTicker.values()].some((c) => c === 'USD'),
    [currencyByTicker],
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

  if (isLoading) {
    return <p className="text-gray-400 animate-pulse py-6">Carregando dados Bazin…</p>
  }

  if (isError) {
    return (
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
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Controle de DY mínimo */}
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-dark-border bg-dark-surface px-6 py-5">
        <div>
          <label htmlFor="min-dy" className="block text-sm font-medium text-gray-300 mb-1">
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

        <div className="text-sm text-gray-400 flex-1">
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

        {hasUSD && isUSDRateFallback && (
          <div className="flex items-center gap-1.5 text-xs text-amber-400">
            <span>⚠ Taxa USD/BRL aproximada</span>
            <USDFallbackBadge />
          </div>
        )}
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
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Ticker</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Dividendo 12M (R$/ação)</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Cotação atual</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Preço-Teto Bazin</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Margem</th>
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

// ─── seção Graham ─────────────────────────────────────────────────────────────

const GRAHAM_NA_REASON =
  'Sem LPA (Lucro Por Ação) ou VPA (Valor Patrimonial Por Ação) disponíveis. O cálculo Graham exige ambos positivos.'

function GrahamRow({ result }: { result: GrahamResult }) {
  const CELL = 'px-4 py-3 text-sm text-gray-200'
  const CELL_RIGHT = `${CELL} text-right`

  return (
    <tr className="border-t border-dark-border hover:bg-dark-surface/50 transition-colors">
      <th scope="row" className={`${CELL} font-semibold text-white text-left`}>
        <span className="flex items-center gap-2">
          {result.ticker}
          {result.currency === 'USD' && (
            <span className="text-xs text-gray-500 font-normal">USD→BRL</span>
          )}
        </span>
      </th>

      {/* LPA */}
      <td className={CELL_RIGHT}>
        {result.lpa !== null && result.lpa !== undefined
          ? (result.currency === 'USD' ? formatDecimal(result.lpa) : formatBRL(result.lpa))
          : <NaCell ticker={result.ticker} reason={GRAHAM_NA_REASON} />}
      </td>

      {/* VPA */}
      <td className={CELL_RIGHT}>
        {result.vpa !== null && result.vpa !== undefined
          ? (result.currency === 'USD' ? formatDecimal(result.vpa) : formatBRL(result.vpa))
          : <NaCell ticker={result.ticker} reason={GRAHAM_NA_REASON} />}
      </td>

      {/* Cotação atual (em BRL) */}
      <td className={CELL_RIGHT}>{formatBRL(result.currentPrice)}</td>

      {/* Preço Justo Graham (em BRL) */}
      <td className={CELL_RIGHT}>
        {result.grahamPrice !== null
          ? formatBRL(result.grahamPrice)
          : <NaCell ticker={result.ticker} reason={GRAHAM_NA_REASON} />}
      </td>

      {/* Margem */}
      <td className={CELL_RIGHT}>
        {result.hasData
          ? <MarginIndicator margin={result.margin} positiveLabel="abaixo do justo" negativeLabel="acima do justo" />
          : <NaCell ticker={result.ticker} reason={GRAHAM_NA_REASON} />}
      </td>
    </tr>
  )
}

interface GrahamSectionProps {
  tickers: string[]
  currencyByTicker: Map<string, AssetCurrency>
}

function GrahamSection({ tickers, currencyByTicker }: GrahamSectionProps) {
  const { sortedResults, isLoading, isError, isUSDRateFallback, refetch } = useGraham(
    tickers,
    currencyByTicker,
  )

  const hasUSD = useMemo(
    () => [...currencyByTicker.values()].some((c) => c === 'USD'),
    [currencyByTicker],
  )

  if (isLoading) {
    return <p className="text-gray-400 animate-pulse py-6">Carregando dados Graham…</p>
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 flex flex-col gap-3"
      >
        <p className="text-red-400 font-medium">Erro ao carregar fundamentals ou cotações.</p>
        <button
          type="button"
          onClick={refetch}
          className="self-start rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium px-4 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  const withData = sortedResults.filter((r) => r.hasData && r.margin !== null)

  return (
    <div className="flex flex-col gap-4">
      {/* Sumário + badge USD */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-dark-border bg-dark-surface px-6 py-4">
        <div className="text-sm text-gray-400 flex-1">
          <p>
            Preço justo ={' '}
            <span className="text-white font-mono">√(22,5 × LPA × VPA)</span>
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            {withData.filter((r) => (r.margin ?? 0) > 0).length} ativo(s) abaixo do justo ·{' '}
            {withData.filter((r) => (r.margin ?? 0) <= 0).length} acima
          </p>
        </div>

        {hasUSD && isUSDRateFallback && (
          <div className="flex items-center gap-1.5 text-xs text-amber-400">
            <span>⚠ Taxa USD/BRL aproximada</span>
            <USDFallbackBadge />
          </div>
        )}
      </div>

      {/* Tabela */}
      {sortedResults.length === 0 ? (
        <div className="rounded-xl border border-dashed border-dark-border p-10 text-center">
          <p className="text-gray-400">Nenhum dado Graham disponível para a carteira atual.</p>
          <p className="text-gray-500 text-sm mt-1">
            O cálculo exige LPA e VPA positivos na tabela de fundamentals.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-dark-border">
          <table className="w-full border-collapse">
            <caption className="sr-only">Preço Justo Graham por ativo da carteira</caption>
            <thead className="bg-dark-bg">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Ticker</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">LPA</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">VPA</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Cotação atual</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Preço Justo Graham</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Margem</th>
              </tr>
            </thead>
            <tbody>
              {sortedResults.map((result) => (
                <GrahamRow key={result.ticker} result={result} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── página principal ─────────────────────────────────────────────────────────

export function EstrategiasPage() {
  const [activeStrategy, setActiveStrategy] = useState<StrategyId>('bazin')

  const { data: positions = [], isLoading: positionsLoading } = usePositions()
  const { hasPositions, isLoading: hasPositionsLoading } = useHasPositions()

  const tickers = useMemo(() => positions.map((p) => p.ticker), [positions])

  // Mapa ticker → moeda, derivado das posições (asset.currency vem do join)
  const currencyByTicker = useMemo<Map<string, AssetCurrency>>(() => {
    const map = new Map<string, AssetCurrency>()
    for (const p of positions) {
      if (p.asset?.currency) map.set(p.ticker, p.asset.currency)
    }
    return map
  }, [positions])

  const isLoading = positionsLoading || hasPositionsLoading

  const activeStrategyMeta = STRATEGIES.find((s) => s.id === activeStrategy)!

  // ── Estado: carregando ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white mb-6">Estratégias</h1>
        <p className="text-gray-400 animate-pulse">Carregando dados…</p>
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
            Adicione ativos na Carteira para visualizar as estratégias de valuation.
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
        <p className="text-gray-400 text-sm">{activeStrategyMeta.description}</p>
      </div>

      {/* Seletor de estratégia */}
      <StrategyTabs active={activeStrategy} onChange={setActiveStrategy} />

      {/* Painel ativo */}
      <div
        role="tabpanel"
        id={`panel-${activeStrategy}`}
        aria-labelledby={`tab-${activeStrategy}`}
      >
        {activeStrategy === 'bazin' && (
          <BazinSection tickers={tickers} currencyByTicker={currencyByTicker} />
        )}
        {activeStrategy === 'graham' && (
          <GrahamSection tickers={tickers} currencyByTicker={currencyByTicker} />
        )}
      </div>
    </div>
  )
}
