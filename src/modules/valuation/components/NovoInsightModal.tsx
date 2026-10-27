import { useEffect, useRef, useState } from 'react'
import { TrendingDown, TrendingUp, Loader2, BookOpen, BarChart2, ChevronDown, Search } from 'lucide-react'
import { Modal } from '../../../shared/components/Modal'
import { useAssetSearch, useTickerLatestPrice } from '../../portfolio/hooks/useAssetSearch'
import { useFundamentals } from '../../score/hooks/useFundamentals'
import { useUSDRate } from '../../../shared/hooks/useUSDRate'
import { USD_RATE_DEFAULT } from '../../../shared/services/usdRateService'
import { useOnDemandBazin } from '../hooks/useOnDemandBazin'
import { useCreateBazinInsight, useCreateGrahamInsight } from '../hooks/useInsights'
import { calcGrahamPrice, calcGrahamMargin } from '../utils/grahamCalculation'
import type { Asset } from '../../portfolio/types'
import type { InsightStrategy } from '../types'
import { ValuationGuide } from './ValuationGuide'

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
    <div className="flex justify-between items-center gap-3 py-2.5 border-b border-white/[0.06] last:border-0">
      <span className="text-xs text-white/50">{label}</span>
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
    <span className={`inline-flex flex-wrap items-center justify-end gap-1 text-xs font-medium ${margin === 0 ? 'text-white/60' : isOpp ? 'text-nf-green' : 'text-[#f288ba]'}`}>
      {isOpp ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
      {fmtPct(Math.abs(margin))}
      <span className="text-xs font-normal ml-1">{isOpp ? 'abaixo do teto' : 'acima do teto'}</span>
    </span>
  )
}

// ─── NovoInsightModal ─────────────────────────────────────────────────────────

interface NovoInsightModalProps {
  onClose: () => void
  initialStrategy?: InsightStrategy
}

export function NovoInsightModal({ onClose, initialStrategy = 'bazin' }: NovoInsightModalProps) {
  // ── estado do formulário ──────────────────────────────────────────────────
  const [strategy, setStrategy] = useState<InsightStrategy>(initialStrategy)
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
  const grahamApplicable = selectedAsset !== null && ['stock_br', 'stock_us', 'bdr'].includes(selectedAsset.type)
  const grahamPriceLocal = grahamApplicable ? calcGrahamPrice(grahamLpa, grahamVpa) : null
  const fx = selectedAsset?.currency === 'USD' ? usdRate : 1
  const grahamPrice = grahamPriceLocal !== null ? grahamPriceLocal * fx : null
  const grahamCurrentPrice = latestPrice !== null ? latestPrice * fx : null
  const grahamMargin = calcGrahamMargin(grahamPrice, grahamCurrentPrice)
  const grahamHasData = grahamPrice !== null

  const createGraham = useCreateGrahamInsight()

  // ── reset resultado Bazin quando muda estratégia ou ticker ────────────────
  useEffect(() => { bazin.reset() }, [strategy, ticker, minDYPct]) // eslint-disable-line react-hooks/exhaustive-deps

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
    <Modal isOpen title="Novo Insight" onClose={onClose} dismissible={!isSaving} initialFocusSelector="#insight-ticker">
        <div className="flex flex-col gap-5">
          <p className="-mt-1 text-xs leading-relaxed text-white/45">Compare a cotação com uma referência de preço e salve a análise para consultar depois.</p>

          {/* Seletor de estratégia */}
          <div>
            <span className="block text-xs font-medium text-white/60 mb-2">Método de análise</span>
            <div className="grid grid-cols-2 gap-3">
              {(['bazin', 'graham'] as InsightStrategy[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={strategy === s}
                  disabled={isSaving}
                  onClick={() => setStrategy(s)}
                  className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a0a7ff] ${
                    strategy === s
                      ? s === 'bazin' ? 'border-[#797fff]/60 bg-[#797fff]/10 text-[#b6baff]' : 'border-[#e477a7]/60 bg-[#e477a7]/10 text-[#f29fc3]'
                      : 'border-white/10 bg-[#1b1b1b] text-white/45 hover:border-white/25 hover:text-white'
                  }`}
                >
                  {s === 'bazin'
                    ? <BarChart2 className="h-4 w-4" />
                    : <BookOpen className="h-4 w-4" />}
                  {s === 'bazin' ? 'Bazin' : 'Graham'}
                </button>
              ))}
            </div>
            <p className={`mt-3 rounded-lg border p-3 text-xs leading-relaxed ${strategy === 'bazin' ? 'border-[#797fff]/25 bg-[#797fff]/[0.05] text-[#c2c5ff]' : 'border-[#e477a7]/25 bg-[#e477a7]/[0.05] text-[#efb9d1]'}`}>
              {strategy === 'bazin'
                ? 'Preço-teto = Dividendo anual ÷ DY mínimo. Usa proventos reais via Yahoo Finance.'
                : 'Preço justo = √(22,5 × LPA × VPA). Usa fundamentais da tabela do banco.'}
            </p>
          </div>

          {/* Ticker com autocomplete */}
          <div>
            <label htmlFor="insight-ticker" className="block text-xs font-medium text-white/60 mb-2">
              Ativo
            </label>
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-white/35" />
              <input
                id="insight-ticker"
                ref={tickerInputRef}
                type="text"
                disabled={isSaving}
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
                className="h-11 w-full rounded-lg border border-white/15 bg-[#222222] pl-10 pr-3 text-sm text-white placeholder-white/30 focus:border-[#9299ff] focus:outline-none focus:ring-1 focus:ring-[#9299ff]/30"
              />

              {isSuggestionsOpen && (
                <ul
                  id="insight-suggestions"
                  role="listbox"
                  aria-label="Ativos do catálogo"
                  className="absolute z-10 mt-2 max-h-52 w-full overflow-auto rounded-xl border border-white/15 bg-[#222222] py-1 shadow-xl"
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
                          ? 'bg-[#797fff]/20 text-white'
                          : 'text-white/80 hover:bg-white/5'
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
              <label htmlFor="insight-min-dy" className="block text-xs font-medium text-white/60 mb-2">
                DY mínimo desejado (%)
              </label>
              <input
                id="insight-min-dy"
                type="number"
                min="0.1"
                max="100"
                step="0.5"
                value={minDYPct}
                disabled={bazinCalculating || isSaving}
                onChange={(e) => setMinDYPct(e.target.value)}
                className="h-11 w-full rounded-lg border border-white/15 bg-[#222222] px-3 text-sm text-white focus:border-[#9299ff] focus:outline-none focus:ring-1 focus:ring-[#9299ff]/30"
              />
            </div>
          )}

          {/* Botão calcular Bazin */}
          {strategy === 'bazin' && (
            <button
              type="button"
              disabled={!selectedAsset || bazinCalculating || isSaving}
              onClick={handleCalculateBazin}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-[#797fff]/35 bg-[#797fff]/10 px-4 py-2.5 text-xs font-medium text-[#c2c5ff] transition-colors hover:bg-[#797fff]/20 disabled:cursor-not-allowed disabled:opacity-40"
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
            <div className="rounded-xl border border-[#797fff]/25 bg-[#797fff]/[0.05] p-4">
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
            <div className="rounded-xl border border-[#e477a7]/25 bg-[#e477a7]/[0.05] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
                Resultado — {selectedAsset.ticker}
              </p>
              {!grahamApplicable ? (
                <p className="text-sm text-amber-400">O número de Graham não é adequado a esta classe de ativo. Ele utiliza lucro e patrimônio por ação de empresas.</p>
              ) : fundamentalsData.length === 0 ? (
                <p className="text-sm text-amber-400">
                  Sem fundamentais (LPA/VPA) disponíveis para este ativo no banco.
                </p>
              ) : (
                <>
                  <ResultRow label={`LPA (${selectedAsset.currency})`} value={grahamLpa !== null ? grahamLpa.toFixed(2) : '—'} />
                  <ResultRow label={`VPA (${selectedAsset.currency})`} value={grahamVpa !== null ? grahamVpa.toFixed(2) : '—'} highlight />
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

          <details className="group rounded-xl border border-white/[0.08] bg-[#1b1b1b]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-xs text-white/60 [&::-webkit-details-marker]:hidden">Como funciona este método?<ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" /></summary>
            <div className="px-3 pb-3"><ValuationGuide strategy={strategy} /></div>
          </details>
          {/* Erro ao salvar */}
          {(createBazin.isError || createGraham.isError) && (
            <p className="text-sm text-red-300" role="alert">
              Não foi possível salvar o insight. Tente novamente.
            </p>
          )}

          {/* Ações */}
          <div className="sticky -bottom-6 -mx-6 -mb-6 flex gap-3 border-t border-white/[0.08] bg-[#121212] px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 rounded-full border border-white/15 px-4 py-2.5 text-xs text-white/65 transition-colors hover:bg-white/5 disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!canSave || isSaving}
              onClick={handleSave}
              className="flex flex-1 items-center justify-center gap-2 rounded-full border border-white/15 bg-[#393939] px-4 py-2.5 text-xs font-medium text-white transition-colors hover:bg-[#484848] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSaving
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando…</>
                : 'Salvar Insight'}
            </button>
          </div>
        </div>
    </Modal>
  )
}
