import { useEffect, useRef, useState } from 'react'
import { TrendingDown, TrendingUp, Loader2, X, BookOpen, BarChart2 } from 'lucide-react'
import { useAssetSearch, useTickerLatestPrice } from '../../portfolio/hooks/useAssetSearch'
import { useFundamentals } from '../../score/hooks/useFundamentals'
import { useUSDRate } from '../../../shared/hooks/useUSDRate'
import { USD_RATE_DEFAULT } from '../../../shared/services/usdRateService'
import { useOnDemandBazin } from '../hooks/useOnDemandBazin'
import { useCreateBazinInsight, useCreateGrahamInsight } from '../hooks/useInsights'
import { calcGrahamPrice, calcGrahamMargin } from '../utils/grahamCalculation'
import type { Asset } from '../../portfolio/types'
import type { InsightStrategy } from '../types'

// ─── helpers ──────────────────────────────────────────────────────────────────

const brlFmt = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
})
const pctFmt = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
})

function fmt(v: number | null) {
  return v === null || !Number.isFinite(v) ? '—' : brlFmt.format(v)
}
function fmtPct(v: number | null) {
  return v === null || !Number.isFinite(v) ? '—' : `${pctFmt.format(v)}%`
}

function useDebouncedValue(value: string, ms: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return debounced
}

// ─── ResultCard ───────────────────────────────────────────────────────────────

function ResultRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-dark-border last:border-0">
      <span className="text-sm text-gray-400">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-white' : 'text-gray-200'}`}>
        {value}
      </span>
    </div>
  )
}

function MarginBadge({ margin }: { margin: number | null }) {
  if (margin === null || !Number.isFinite(margin)) {
    return <span className="text-gray-500 text-sm">—</span>
  }
  const isOpp = margin > 0
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-bold ${isOpp ? 'text-green-400' : 'text-red-400'}`}>
      {isOpp ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
      {fmtPct(margin)}
      <span className="text-xs font-normal ml-1">{isOpp ? 'abaixo do teto' : 'acima do teto'}</span>
    </span>
  )
}

// ─── NovoInsightModal ─────────────────────────────────────────────────────────

interface NovoInsightModalProps {
  onClose: () => void
}

export function NovoInsightModal({ onClose }: NovoInsightModalProps) {
  // ── estado do formulário ──────────────────────────────────────────────────
  const [strategy, setStrategy] = useState<InsightStrategy>('bazin')
  const [ticker, setTicker] = useState('')
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [minDYPct, setMinDYPct] = useState('6')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const tickerInputRef = useRef<HTMLInputElement>(null)

  // ── autocomplete de ticker ────────────────────────────────────────────────
  const debouncedTicker = useDebouncedValue(ticker, 250)
  const { data: suggestions = [] } = useAssetSearch(debouncedTicker)
  const isSuggestionsOpen = showSuggestions && suggestions.length > 0

  useEffect(() => {
    setHighlightedIndex((i) => Math.min(i, suggestions.length - 1))
  }, [suggestions.length])

  function selectAsset(asset: Asset | undefined) {
    if (!asset) return
    setTicker(asset.ticker)
    setSelectedAsset(asset)
    setShowSuggestions(false)
    setHighlightedIndex(-1)
  }

  function handleTickerKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape' && isSuggestionsOpen) {
      e.stopPropagation()
      setShowSuggestions(false)
      return
    }
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && suggestions.length > 0) {
      e.preventDefault()
      setShowSuggestions(true)
      setHighlightedIndex((i) => {
        const next = i + (e.key === 'ArrowDown' ? 1 : -1)
        if (next < 0) return suggestions.length - 1
        if (next >= suggestions.length) return 0
        return next
      })
      return
    }
    if (e.key === 'Enter' && isSuggestionsOpen && highlightedIndex >= 0) {
      e.preventDefault()
      selectAsset(suggestions[highlightedIndex])
    }
  }

  // ── Bazin on-demand ───────────────────────────────────────────────────────
  const bazin = useOnDemandBazin()
  const createBazin = useCreateBazinInsight()

  // ── Graham — busca fundamentais quando ticker selecionado ─────────────────
  const grahamTicker = selectedAsset?.ticker ?? ''
  const { data: fundamentalsData = [] } = useFundamentals(grahamTicker ? [grahamTicker] : [])
  const latestPrice = useTickerLatestPrice(grahamTicker)
  const usdRateQuery = useUSDRate({ enabled: selectedAsset?.currency === 'USD' })
  const usdRate = usdRateQuery.data?.rate ?? USD_RATE_DEFAULT

  const grahamFund = fundamentalsData[0] ?? null
  const grahamLpa = grahamFund?.lpa ?? null
  const grahamVpa = grahamFund?.vpa ?? null
  const grahamPriceLocal = calcGrahamPrice(grahamLpa, grahamVpa)
  const fx = selectedAsset?.currency === 'USD' ? usdRate : 1
  const grahamPrice = grahamPriceLocal !== null ? grahamPriceLocal * fx : null
  const grahamCurrentPrice = latestPrice !== null ? latestPrice * fx : null
  const grahamMargin = calcGrahamMargin(grahamPrice, grahamCurrentPrice)
  const grahamHasData = grahamPrice !== null

  const createGraham = useCreateGrahamInsight()

  // ── reset resultado Bazin quando muda estratégia ou ticker ────────────────
  useEffect(() => { bazin.reset() }, [strategy, ticker]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── calcular Bazin ────────────────────────────────────────────────────────
  async function handleCalculateBazin() {
    if (!selectedAsset) return
    const minDY = parseFloat(minDYPct) / 100
    if (!Number.isFinite(minDY) || minDY <= 0) return
    await bazin.calculate(selectedAsset.ticker, selectedAsset.currency, minDY)
  }

  // ── salvar insight ────────────────────────────────────────────────────────
  async function handleSave() {
    if (!selectedAsset) return

    if (strategy === 'bazin' && bazin.result) {
      const minDY = parseFloat(minDYPct) / 100
      await createBazin.mutateAsync({
        ticker: selectedAsset.ticker,
        currency: selectedAsset.currency,
        min_dy: minDY,
        annual_dividend: bazin.result.annualDividend,
        ceiling_price: bazin.result.ceilingPrice,
        current_price: bazin.result.currentPrice,
        margin: bazin.result.margin,
      })
      onClose()
    }

    if (strategy === 'graham' && grahamHasData) {
      await createGraham.mutateAsync({
        ticker: selectedAsset.ticker,
        currency: selectedAsset.currency,
        graham_price: grahamPrice,
        current_price: grahamCurrentPrice,
        margin: grahamMargin,
        lpa: grahamLpa,
        vpa: grahamVpa,
      })
      onClose()
    }
  }

  const bazinCalculating = bazin.status === 'fetching-dividends' || bazin.status === 'fetching-quote'
  const bazinDone = bazin.status === 'done' && bazin.result !== null
  const grahamReady = strategy === 'graham' && selectedAsset !== null && grahamHasData
  const canSave = (strategy === 'bazin' && bazinDone) || (strategy === 'graham' && grahamReady)
  const isSaving = createBazin.isPending || createGraham.isPending

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="insight-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg rounded-xl border border-dark-border bg-dark-surface shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-border">
          <h2 id="insight-modal-title" className="text-lg font-bold text-white">
            Novo Insight
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">

          {/* Seletor de estratégia */}
          <div>
            <span className="block text-sm font-medium text-gray-300 mb-2">Estratégia</span>
            <div className="grid grid-cols-2 gap-2">
              {(['bazin', 'graham'] as InsightStrategy[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStrategy(s)}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold transition-colors ${
                    strategy === s
                      ? 'border-blue-500 bg-blue-500/10 text-blue-200'
                      : 'border-dark-border text-gray-400 hover:border-gray-500 hover:text-gray-200'
                  }`}
                >
                  {s === 'bazin'
                    ? <BarChart2 className="h-4 w-4" />
                    : <BookOpen className="h-4 w-4" />}
                  {s === 'bazin' ? 'Bazin' : 'Graham'}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {strategy === 'bazin'
                ? 'Preço-teto = Dividendo anual ÷ DY mínimo. Usa proventos reais via Yahoo Finance.'
                : 'Preço justo = √(22,5 × LPA × VPA). Usa fundamentais da tabela do banco.'}
            </p>
          </div>

          {/* Ticker com autocomplete */}
          <div>
            <label htmlFor="insight-ticker" className="block text-sm font-medium text-gray-300 mb-1">
              Ativo
            </label>
            <div className="relative">
              <input
                id="insight-ticker"
                ref={tickerInputRef}
                type="text"
                autoComplete="off"
                role="combobox"
                aria-expanded={isSuggestionsOpen}
                aria-controls="insight-suggestions"
                aria-autocomplete="list"
                aria-activedescendant={
                  isSuggestionsOpen && highlightedIndex >= 0
                    ? `insight-option-${highlightedIndex}`
                    : undefined
                }
                value={ticker}
                onChange={(e) => {
                  setTicker(e.target.value)
                  setSelectedAsset(null)
                  setShowSuggestions(true)
                  setHighlightedIndex(-1)
                }}
                onBlur={() => setShowSuggestions(false)}
                onKeyDown={handleTickerKeyDown}
                placeholder="Ticker ou nome, ex.: MXRF11"
                className="w-full rounded-lg border border-dark-border bg-dark-bg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />

              {isSuggestionsOpen && (
                <ul
                  id="insight-suggestions"
                  role="listbox"
                  aria-label="Ativos do catálogo"
                  className="absolute z-10 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-dark-border bg-dark-bg shadow-xl"
                >
                  {suggestions.map((asset, index) => (
                    <li
                      key={asset.ticker}
                      id={`insight-option-${index}`}
                      role="option"
                      aria-selected={index === highlightedIndex}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onClick={() => selectAsset(asset)}
                      className={`flex cursor-pointer items-baseline justify-between gap-3 px-4 py-2 transition-colors ${
                        index === highlightedIndex
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-200 hover:bg-dark-border/30'
                      }`}
                    >
                      <span className="font-semibold">{asset.ticker}</span>
                      <span className={`truncate text-xs ${index === highlightedIndex ? 'text-white' : 'text-gray-400'}`}>
                        {asset.name}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {selectedAsset && (
              <p className="mt-1 text-xs text-gray-400">
                {selectedAsset.name} · {selectedAsset.currency}
              </p>
            )}
          </div>

          {/* DY mínimo — só Bazin */}
          {strategy === 'bazin' && (
            <div>
              <label htmlFor="insight-min-dy" className="block text-sm font-medium text-gray-300 mb-1">
                DY mínimo desejado (%)
              </label>
              <input
                id="insight-min-dy"
                type="number"
                min="0.1"
                max="100"
                step="0.5"
                value={minDYPct}
                onChange={(e) => setMinDYPct(e.target.value)}
                className="w-32 rounded-lg border border-dark-border bg-dark-bg px-3 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}

          {/* Botão calcular Bazin */}
          {strategy === 'bazin' && (
            <button
              type="button"
              disabled={!selectedAsset || bazinCalculating}
              onClick={handleCalculateBazin}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {bazinCalculating
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Buscando proventos…</>
                : bazinDone
                ? 'Recalcular'
                : 'Calcular'}
            </button>
          )}

          {/* Erro Bazin */}
          {strategy === 'bazin' && bazin.status === 'error' && (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300" role="alert">
              {bazin.error}
            </p>
          )}

          {/* Resultado Bazin */}
          {strategy === 'bazin' && bazinDone && bazin.result && (
            <div className="rounded-xl border border-dark-border bg-dark-bg p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
                Resultado — {bazin.result.ticker}
                {bazin.yahooData && (
                  <span className="ml-2 text-gray-600">
                    ({bazin.yahooData.payments.length} pagamento{bazin.yahooData.payments.length !== 1 ? 's' : ''} via Yahoo Finance)
                  </span>
                )}
              </p>
              <ResultRow label="Dividendo 12M" value={fmt(bazin.result.annualDividend)} highlight />
              <ResultRow label="Cotação atual" value={fmt(bazin.result.currentPrice)} />
              <ResultRow label="Preço-teto Bazin" value={fmt(bazin.result.ceilingPrice)} highlight />
              <div className="flex justify-between items-center pt-2">
                <span className="text-sm text-gray-400">Margem</span>
                <MarginBadge margin={bazin.result.margin} />
              </div>
              {!bazin.result.hasData && (
                <p className="mt-3 text-xs text-amber-400">
                  Nenhum provento encontrado nos últimos 12 meses via Yahoo Finance.
                </p>
              )}
            </div>
          )}

          {/* Resultado Graham — aparece ao selecionar ativo */}
          {strategy === 'graham' && selectedAsset && (
            <div className="rounded-xl border border-dark-border bg-dark-bg p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
                Resultado — {selectedAsset.ticker}
              </p>
              {fundamentalsData.length === 0 ? (
                <p className="text-sm text-amber-400">
                  Sem fundamentais (LPA/VPA) disponíveis para este ativo no banco.
                </p>
              ) : (
                <>
                  <ResultRow label="LPA" value={grahamLpa !== null ? `R$ ${grahamLpa.toFixed(2)}` : '—'} />
                  <ResultRow label="VPA" value={grahamVpa !== null ? `R$ ${grahamVpa.toFixed(2)}` : '—'} highlight />
                  <ResultRow label="Cotação atual" value={fmt(grahamCurrentPrice)} />
                  <ResultRow label="Preço justo Graham" value={fmt(grahamPrice)} highlight />
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-sm text-gray-400">Margem</span>
                    <MarginBadge margin={grahamMargin} />
                  </div>
                  {!grahamHasData && (
                    <p className="mt-3 text-xs text-amber-400">
                      LPA ou VPA inválidos — Graham exige ambos positivos.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Erro ao salvar */}
          {(createBazin.isError || createGraham.isError) && (
            <p className="text-sm text-red-300" role="alert">
              Não foi possível salvar o insight. Tente novamente.
            </p>
          )}

          {/* Ações */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-dark-border px-4 py-2.5 text-sm text-gray-300 hover:bg-dark-border/20"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!canSave || isSaving}
              onClick={handleSave}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando…</>
                : 'Salvar Insight'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
