import { useEffect, useRef, useState } from 'react'
import { Bell, BellRing, TrendingDown, TrendingUp, AlertTriangle, Clock, Plus, RefreshCw, X } from 'lucide-react'
import {
  useGenerateAlerts,
  useUpdateAlertStatus,
  useCreatePriceTargetAlert,
  useCheckPriceTargets,
} from '../hooks/useAlertMutations'
import { useAlerts } from '../hooks/useAlerts'
import { useAssetSearch, useTickerLatestPrice } from '../../portfolio/hooks/useAssetSearch'
import type { Asset } from '../../portfolio/types'
import type { Alert, AlertCondition, AlertType } from '../types'

// ─── Formatadores ────────────────────────────────────────────────────────────

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
}

function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

// ─── Configuração visual por tipo ─────────────────────────────────────────────

type AlertConfig = {
  label: string
  tickerColor: string
  Icon: React.ComponentType<{ className?: string }>
}

const secondaryButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-purple disabled:cursor-not-allowed disabled:opacity-50'
const primaryButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-[#393939] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#454545] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-purple disabled:cursor-not-allowed disabled:opacity-50'
const inputStyle = 'min-h-11 w-full rounded-xl border border-white/[0.12] bg-[#131313] px-3.5 py-2.5 text-sm text-white placeholder:text-nf-muted focus:border-nf-purple focus:outline-none focus:ring-1 focus:ring-nf-purple'

const ALERT_CONFIG: Record<AlertType, AlertConfig> = {
  position_no_transactions: {
    label: 'Inconsistência',
    tickerColor: 'text-amber-300',
    Icon: AlertTriangle,
  },
  stale_quote: {
    label: 'Cotação antiga',
    tickerColor: 'text-amber-300',
    Icon: Clock,
  },
  opportunity: {
    label: 'Oportunidade',
    tickerColor: 'text-green-400',
    Icon: TrendingDown,
  },
  overvalued: {
    label: 'Sobrevalorizado',
    tickerColor: 'text-red-400',
    Icon: TrendingUp,
  },
  price_target: {
    label: 'Preço-alvo',
    tickerColor: 'text-nf-purple',
    Icon: BellRing,
  },
}

// ─── AlertCard ────────────────────────────────────────────────────────────────

function AlertCard({ alert }: { alert: Alert }) {
  const updateStatus = useUpdateAlertStatus()
  const isIgnored = alert.status === 'ignorado'
  const config = ALERT_CONFIG[alert.type] ?? ALERT_CONFIG.position_no_transactions
  const { Icon } = config

  // Alerta price_target disparado (novo) → mostra pergunta de confirmação
  const isPriceTargetTriggered = alert.type === 'price_target' && alert.status === 'novo'

  return (
    <article
      className="rounded-[14px] border border-white/[0.08] bg-nf-surface p-4 sm:p-5"
      aria-label={alert.title}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/[0.06]">
              <Icon className={`h-4 w-4 ${config.tickerColor}`} aria-hidden="true" />
            </span>
            <p className={`text-xs font-semibold uppercase tracking-wide ${config.tickerColor}`}>
              {alert.ticker}
            </p>
            <span className="rounded-full border border-white/[0.1] px-2 py-0.5 text-xs text-nf-muted">
              {config.label}
            </span>
          </div>
          <h2 className="text-base font-semibold text-white sm:text-lg">{alert.title}</h2>

          {/* Contexto extra para price_target */}
          {alert.type === 'price_target' && alert.target_price != null && alert.condition != null && (
            <p className="mt-1 text-sm text-nf-muted">
              Condição:{' '}
              <span className="font-medium text-white">
                {alert.condition === 'below' ? 'Abaixo de' : 'Acima de'}{' '}
                {formatCurrency(alert.target_price)}
              </span>
            </p>
          )}
        </div>

        <span
          className={`rounded-full border px-2 py-1 text-xs ${
            alert.status === 'novo'
              ? 'border-nf-purple/40 bg-nf-purple/10 text-nf-purple'
              : 'border-white/[0.12] text-zinc-300'
          }`}
        >
          {alert.status === 'novo'
            ? 'Novo'
            : alert.status === 'lido'
              ? alert.type === 'price_target'
                ? 'Monitorando'
                : 'Lido'
              : 'Ignorado'}
        </span>
      </div>

      <p className="mt-3 text-sm text-zinc-300">{alert.description}</p>
      <p className="mt-3 text-xs text-nf-muted">Criado em {formatDate(alert.created_at)}</p>

      {/* Ações para alertas price_target disparados */}
      {isPriceTargetTriggered && (
        <div className="mt-4 rounded-xl border border-nf-purple/20 bg-nf-purple/[0.06] p-4">
          <p className="text-sm font-medium text-white">
            🎯 Preço-alvo atingido! Deseja manter o alerta ativo para monitorar novamente?
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate({ alertId: alert.id, status: 'lido' })}
              className={primaryButton}
            >
              Manter ativo
            </button>
            <button
              type="button"
              disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate({ alertId: alert.id, status: 'ignorado' })}
              className={secondaryButton}
            >
              Fechar alerta
            </button>
          </div>
        </div>
      )}

      {/* Ações padrão para os outros tipos */}
      {!isIgnored && !isPriceTargetTriggered && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {alert.status === 'novo' && (
            <button
              type="button"
              disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate({ alertId: alert.id, status: 'lido' })}
              className={secondaryButton}
            >
              Marcar como lido
            </button>
          )}
          <button
            type="button"
            disabled={updateStatus.isPending}
            onClick={() => updateStatus.mutate({ alertId: alert.id, status: 'ignorado' })}
            className={secondaryButton}
          >
            Ignorar
          </button>
        </div>
      )}

      {updateStatus.isError && (
        <p className="mt-3 text-sm text-red-300" role="alert">
          Não foi possível atualizar este alerta. Tente novamente.
        </p>
      )}
    </article>
  )
}

// ─── Debounce ────────────────────────────────────────────────────────────────

function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

// ─── Formulário de criação de alerta de preço-alvo ───────────────────────────

function PriceTargetForm({ onClose }: { onClose: () => void }) {
  const createAlert = useCreatePriceTargetAlert()
  const [ticker, setTicker] = useState('')
  const [price, setPrice] = useState('')
  const [condition, setCondition] = useState<AlertCondition>('below')

  // ── Autocomplete ──────────────────────────────────────────────────────────
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [priceAutoFilled, setPriceAutoFilled] = useState(false)
  const debouncedTicker = useDebouncedValue(ticker, 250)
  const { data: suggestions = [] } = useAssetSearch(debouncedTicker)
  const latestPrice = useTickerLatestPrice(ticker)
  const inputRef = useRef<HTMLInputElement>(null)

  const isSuggestionsOpen = showSuggestions && suggestions.length > 0

  // Ajusta o índice realçado quando a lista encurta (debounce pode reduzir
  // resultados antes que o índice seja zerado pelas setas)
  useEffect(() => {
    setHighlightedIndex((i) => Math.min(i, suggestions.length - 1))
  }, [suggestions.length])

  function selectAsset(asset: Asset | undefined) {
    if (!asset) return
    setTicker(asset.ticker)
    setShowSuggestions(false)
    setHighlightedIndex(-1)
    // Foca no campo de preço após selecionar o ativo
    setTimeout(() => document.getElementById('pt-price')?.focus(), 0)
  }

  // Preenche o preço automaticamente quando a cotação chega após selecionar o ticker
  useEffect(() => {
    if (latestPrice !== null && ticker && !priceAutoFilled) {
      setPrice(latestPrice.toFixed(2))
      setPriceAutoFilled(true)
    }
  }, [latestPrice, ticker, priceAutoFilled])
  function handleTickerKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape' && isSuggestionsOpen) {
      e.stopPropagation()
      setShowSuggestions(false)
      setHighlightedIndex(-1)
      return
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (suggestions.length === 0) return
      e.preventDefault()
      setShowSuggestions(true)
      const step = e.key === 'ArrowDown' ? 1 : -1
      setHighlightedIndex((i) => {
        const next = i + step
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
  // ──────────────────────────────────────────────────────────────────────────

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedTicker = ticker.trim().toUpperCase()
    const parsedPrice = parseFloat(price.replace(',', '.'))
    if (!trimmedTicker || Number.isNaN(parsedPrice) || parsedPrice <= 0) return
    createAlert.mutate(
      { ticker: trimmedTicker, targetPrice: parsedPrice, condition },
      { onSuccess: onClose },
    )
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="form-title"
      className="rounded-[14px] border border-white/[0.08] bg-nf-surface p-4 sm:p-6"
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 id="form-title" className="text-lg font-semibold text-white sm:text-xl">
          Novo alerta de preço
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar formulário"
          className="grid h-10 w-10 place-items-center rounded-xl text-nf-muted transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-purple"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ── Ticker com autocomplete ──────────────────────────────────────── */}
        <div>
          <label htmlFor="pt-ticker" className="mb-2 block text-sm font-medium text-zinc-300">
            Ativo
          </label>
          <div className="relative">
            <input
              id="pt-ticker"
              ref={inputRef}
              type="text"
              autoComplete="off"
              role="combobox"
              aria-expanded={isSuggestionsOpen}
              aria-controls="pt-suggestions"
              aria-autocomplete="list"
              aria-activedescendant={
                isSuggestionsOpen && highlightedIndex >= 0
                  ? `pt-option-${highlightedIndex}`
                  : undefined
              }
              value={ticker}
              onChange={(e) => {
                setTicker(e.target.value)
                setShowSuggestions(true)
                setHighlightedIndex(-1)
                // Resetar preço pré-preenchido ao trocar o ticker manualmente
                setPriceAutoFilled(false)
                setPrice('')
              }}
              onBlur={() => setShowSuggestions(false)}
              onKeyDown={handleTickerKeyDown}
              placeholder="Ticker ou nome, ex.: MXRF11"
              required
              className={inputStyle}
            />

            {isSuggestionsOpen && (
              <ul
                id="pt-suggestions"
                role="listbox"
                aria-label="Ativos do catálogo"
                className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-white/[0.12] bg-[#242424] p-1 shadow-xl"
              >
                {suggestions.map((asset, index) => (
                  <li
                    key={asset.ticker}
                    id={`pt-option-${index}`}
                    role="option"
                    aria-selected={index === highlightedIndex}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => selectAsset(asset)}
                    className={`flex cursor-pointer items-baseline justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                      index === highlightedIndex
                        ? 'bg-white/[0.12] text-white'
                        : 'text-zinc-200 hover:bg-white/[0.06]'
                    }`}
                  >
                    <span className="font-semibold">{asset.ticker}</span>
                    <span
                      className={`truncate text-sm ${
                        index === highlightedIndex ? 'text-white' : 'text-nf-muted'
                      }`}
                    >
                      {asset.name}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ── Condição ────────────────────────────────────────────────────── */}
        <div>
          <span className="mb-2 block text-sm font-medium text-zinc-300">Condição</span>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-white/[0.1] bg-[#131313] px-3">
              <input
                type="radio"
                name="pt-condition"
                value="below"
                checked={condition === 'below'}
                onChange={() => setCondition('below')}
                className="accent-nf-purple"
              />
              <TrendingDown className="h-4 w-4 text-green-400" aria-hidden="true" />
              <span className="text-sm text-zinc-200">Abaixo de</span>
            </label>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-white/[0.1] bg-[#131313] px-3">
              <input
                type="radio"
                name="pt-condition"
                value="above"
                checked={condition === 'above'}
                onChange={() => setCondition('above')}
                className="accent-nf-purple"
              />
              <TrendingUp className="h-4 w-4 text-red-400" aria-hidden="true" />
              <span className="text-sm text-zinc-200">Acima de</span>
            </label>
          </div>
        </div>

        {/* ── Preço-alvo ──────────────────────────────────────────────────── */}
        <div>
          <label htmlFor="pt-price" className="mb-2 block text-sm font-medium text-zinc-300">
            Preço-alvo (R$)
          </label>
          <input
            id="pt-price"
            type="number"
            value={price}
            onChange={(e) => { setPrice(e.target.value); setPriceAutoFilled(false) }}
            placeholder="Ex: 9.00"
            min="0.01"
            step="0.01"
            required
            className={inputStyle}
          />
          {priceAutoFilled && latestPrice !== null && (
            <p className="mt-1.5 text-xs text-nf-muted">
              Cotação atual de {ticker}: {formatCurrency(latestPrice)} — você pode ajustar o valor.
            </p>
          )}
        </div>

        {createAlert.isError && (
          <p className="text-sm text-red-300" role="alert">
            {(createAlert.error as Error)?.message?.includes('duplicate') ||
            (createAlert.error as Error)?.message?.includes('unique')
              ? 'Já existe um alerta ativo para este ativo com o mesmo preço e condição.'
              : 'Não foi possível criar o alerta. Tente novamente.'}
          </p>
        )}

        <div className="flex flex-col gap-2 pt-1 sm:flex-row">
          <button
            type="submit"
            disabled={createAlert.isPending}
            className={`${primaryButton} sm:flex-1`}
          >
            {createAlert.isPending ? 'Criando...' : 'Criar alerta'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className={secondaryButton}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── AlertsPage ───────────────────────────────────────────────────────────────

export function AlertsPage() {
  const { data: alerts = [], isLoading, isError, refetch } = useAlerts()
  const generateAlerts = useGenerateAlerts()
  const checkPriceTargets = useCheckPriceTargets()
  const [showForm, setShowForm] = useState(false)

  const hasPriceTargets = alerts.some((a) => a.type === 'price_target' && a.status !== 'ignorado')

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {/* Cabeçalho */}
      <header className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">Alertas</h1>
          <p className="mt-1 text-sm text-nf-muted">
            Inconsistências e preços-alvo monitorados na sua carteira.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {/* Botão verificar preços-alvo — só aparece se houver alertas price_target ativos */}
          {hasPriceTargets && (
            <button
              type="button"
              onClick={() => checkPriceTargets.mutate()}
              disabled={checkPriceTargets.isPending}
              className={secondaryButton}
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              {checkPriceTargets.isPending ? 'Verificando...' : 'Verificar preços-alvo'}
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className={secondaryButton}
          >
            {showForm ? <X className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
            {showForm ? 'Cancelar' : 'Alerta de preço'}
          </button>

          <button
            type="button"
            onClick={() => generateAlerts.mutate()}
            disabled={generateAlerts.isPending}
            className={primaryButton}
          >
            <RefreshCw className={`h-4 w-4 ${generateAlerts.isPending ? 'animate-spin' : ''}`} aria-hidden="true" />
            {generateAlerts.isPending ? 'Atualizando...' : 'Atualizar alertas'}
          </button>
        </div>
      </header>

      {/* Formulário de criação */}
      {showForm && (
        <div className="mb-6">
          <PriceTargetForm onClose={() => setShowForm(false)} />
        </div>
      )}

      {/* Feedback de erros globais */}
      {checkPriceTargets.isError && (
        <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300" role="alert">
          Não foi possível verificar os preços-alvo. A lista atual continua disponível.
        </p>
      )}
      {checkPriceTargets.isSuccess && (
        <p className="mb-4 rounded-xl border border-green-500/30 bg-green-500/5 p-4 text-sm text-green-300" role="status">
          {checkPriceTargets.data.triggered > 0
            ? `${checkPriceTargets.data.triggered} alerta${checkPriceTargets.data.triggered > 1 ? 's' : ''} de preço-alvo disparado${checkPriceTargets.data.triggered > 1 ? 's' : ''}!`
            : 'Nenhum preço-alvo atingido no momento.'}
        </p>
      )}
      {generateAlerts.isError && (
        <p className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300" role="alert">
          Não foi possível gerar alertas. A lista atual continua disponível.
        </p>
      )}
      {isError && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300" role="alert">
          <p>Não foi possível carregar seus alertas.</p>
          <button type="button" onClick={() => refetch()} className="mt-2 underline">
            Tentar novamente
          </button>
        </div>
      )}

      {/* Lista de alertas */}
      {isLoading ? (
        <p className="text-sm text-nf-muted">Carregando alertas...</p>
      ) : isError && alerts.length === 0 ? null : alerts.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-white/[0.12] bg-nf-surface px-5 py-12 text-center">
          <Bell className="mx-auto mb-3 h-6 w-6 text-nf-muted" aria-hidden="true" />
          <p className="font-medium text-zinc-200">Nenhum alerta encontrado</p>
          <p className="mt-1 text-sm text-nf-muted">
            Crie um alerta de preço ou atualize os alertas para verificar sua carteira.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </div>
  )
}
