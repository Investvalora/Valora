import { useEffect, useState } from 'react'
import { Bell, BellRing, TrendingDown, TrendingUp, AlertTriangle, Clock, Plus, RefreshCw, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  useGenerateAlerts,
  useUpdateAlertStatus,
  useCreatePriceTargetAlert,
  useCheckPriceTargets,
} from '../hooks/useAlertMutations'
import { useAlerts } from '../hooks/useAlerts'
import { AlertAssetField, AlertTargetPriceField } from './AlertPriceFields'
import { useAlertPriceFields } from '../hooks/useAlertPriceFields'
import { useAuth } from '../../auth/hooks/useAuth'
import { useIsMobile } from '../../../shared/hooks/useIsMobile'
import type { Alert, AlertCondition, AlertType } from '../types'
import { EditAlertButton } from './EditAlertButton'

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

function formatCreateAlertError(error: unknown) {
  const cause = typeof error === 'object' && error !== null ? error : null
  const code = cause && 'code' in cause ? cause.code : null
  const message = cause && 'message' in cause && typeof cause.message === 'string' ? cause.message : ''
  if (code === '23505' || (!code && /duplicate|unique/i.test(message))) {
    return 'Já existe um alerta ativo com esse preço e condição. Edite o alerta existente ou escolha outra condição.'
  }
  if (code === '23503') {
    return 'Ativo não encontrado no catálogo. Confira o ticker e selecione o ativo na busca.'
  }
  return 'Não foi possível criar o alerta. Tente novamente.'
}

// ─── Configuração visual por tipo ─────────────────────────────────────────────

type AlertConfig = {
  label: string
  tickerColor: string
  Icon: React.ComponentType<{ className?: string }>
}

const secondaryButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-purple disabled:cursor-not-allowed disabled:opacity-50'
const primaryButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-[#393939] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#454545] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-purple disabled:cursor-not-allowed disabled:opacity-50'
const readButton = 'inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-nf-blue/70 bg-nf-blue/10 px-2 py-2.5 text-center text-sm font-medium text-nf-blue transition-colors hover:bg-nf-blue/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-blue disabled:cursor-not-allowed disabled:opacity-50 md:border-white/[0.12] md:bg-white/[0.04] md:text-white md:hover:bg-white/[0.09] md:focus-visible:ring-nf-purple'

function triggerHapticFeedback() {
  if ('vibrate' in navigator) navigator.vibrate(10)
}

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
    tickerColor: 'text-nf-pink',
    Icon: TrendingUp,
  },
  price_target: {
    label: 'Preço-alvo',
    tickerColor: 'text-nf-blue',
    Icon: BellRing,
  },
}

// ─── AlertCard ────────────────────────────────────────────────────────────────

function AlertCard({ alert }: { alert: Alert }) {
  const updateStatus = useUpdateAlertStatus()
  const isIgnored = alert.status === 'ignorado'
  const isMonitoring = alert.status === 'lido' && alert.type === 'price_target'
  const isRead = alert.status === 'lido' && !isMonitoring
  const config = ALERT_CONFIG[alert.type] ?? ALERT_CONFIG.position_no_transactions
  const { Icon } = config
  const statusLabel = alert.status === 'novo'
    ? 'Novo'
    : isMonitoring
      ? 'Monitorando'
      : isRead
        ? 'Lido'
        : 'Ignorado'
  const statusStyle = alert.status === 'novo'
    ? 'border-nf-blue/50 bg-nf-blue/15 text-nf-blue'
    : isMonitoring
      ? 'border-nf-green/50 bg-nf-green/10 text-nf-green'
      : isRead
        ? 'border-zinc-400/35 bg-zinc-400/10 text-zinc-300'
        : 'border-nf-pink/35 bg-nf-pink/10 text-nf-pink'

  // Alerta price_target disparado (novo) → mostra pergunta de confirmação
  const isPriceTargetTriggered = alert.type === 'price_target' && alert.status === 'novo'

  return (
    <article
      className={`rounded-xl border bg-[#131313] p-4 transition-opacity duration-200 md:rounded-[14px] md:bg-nf-surface md:p-5 ${
        isIgnored
          ? 'border-white/[0.08] opacity-60 hover:opacity-100 focus-within:opacity-100'
          : isRead
            ? 'border-white/[0.1] opacity-75 hover:opacity-100 focus-within:opacity-100'
            : isMonitoring
              ? 'border-nf-green/25'
              : 'border-nf-blue/25'
      }`}
      aria-label={alert.title}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="grid h-6 w-6 place-items-center md:h-8 md:w-8 md:rounded-lg md:bg-white/[0.06]">
              <Icon className={`h-4 w-4 ${config.tickerColor}`} aria-hidden="true" />
            </span>
            <p className={`text-xs font-semibold uppercase tracking-wide ${config.tickerColor}`}>
              {alert.ticker}
            </p>
            <span className="rounded-full border border-white/[0.1] px-2 py-0.5 text-xs text-nf-muted">
              {config.label}
            </span>
          </div>
          <h2 className="text-[15px] font-semibold text-white md:text-lg">{alert.title}</h2>

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
          className={`rounded-full border px-2 py-1 text-xs font-medium ${statusStyle}`}
        >
          {statusLabel}
        </span>
      </div>

      <p className="mt-2 text-[12px] leading-snug text-zinc-300 md:text-sm">{alert.description}</p>
      <p className="mt-2 text-[11px] text-nf-muted md:text-xs">Criado em {formatDate(alert.created_at)}</p>
      <div className="mt-3"><EditAlertButton alert={alert} /></div>
      {isIgnored && <p className="mt-2 text-xs text-white/45">Exclusão automática após 3 dias de ignorado.</p>}

      {/* Ações para alertas price_target disparados */}
      {isPriceTargetTriggered && (
        <div className="mt-4 rounded-xl border border-nf-purple/20 bg-nf-purple/[0.06] p-4">
          <p className="text-sm font-medium text-white">
            🎯 Preço-alvo atingido! Deseja manter o alerta ativo para monitorar novamente?
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate({ alertId: alert.id, status: 'lido' })}
              className={readButton}
            >
              Manter ativo
            </button>
            <button
              type="button"
              disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate({ alertId: alert.id, status: 'ignorado' })}
              className={`${secondaryButton} flex-1 px-2`}
            >
              Fechar alerta
            </button>
          </div>
        </div>
      )}

      {/* Ações padrão para os outros tipos */}
      {!isIgnored && !isPriceTargetTriggered && (
        <div className="mt-3 flex gap-2">
          {alert.status === 'novo' && (
            <button
              type="button"
              disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate({ alertId: alert.id, status: 'lido' })}
              className={readButton}
            >
              Marcar como lido
            </button>
          )}
          <button
            type="button"
            disabled={updateStatus.isPending}
            onClick={() => updateStatus.mutate({ alertId: alert.id, status: 'ignorado' })}
            className={`${secondaryButton} flex-1 px-2`}
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

// ─── Formulário de criação de alerta de preço ─────────────────────────────────

function PriceTargetForm({ onClose }: { onClose: () => void }) {
  const createAlert = useCreatePriceTargetAlert()
  const [ticker, setTicker] = useState('')
  const [price, setPrice] = useState('')
  const [condition, setCondition] = useState<AlertCondition>('below')

  const fields = useAlertPriceFields({ ticker, price, onTickerChange: setTicker, onPriceChange: setPrice })
  useEffect(() => {
    function onEscape(event: KeyboardEvent) { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [onClose])

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
      className="alert-price-sheet min-h-[72dvh] max-h-[100dvh] w-full overflow-y-auto overscroll-contain rounded-t-[22px] bg-[#242424] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-16px_40px_rgba(0,0,0,0.25)] md:h-[100dvh] md:min-h-0 md:max-h-[100dvh] md:w-[min(100vw,440px)] md:rounded-none md:border-l md:border-white/[0.08] md:bg-nf-surface md:p-8 md:shadow-[-20px_0_60px_rgba(0,0,0,0.3)]"
    >
      <span aria-hidden="true" className="mx-auto mb-5 block h-1 w-9 rounded-full bg-white/35 md:hidden" />
      <div className="mb-5 flex items-start justify-between gap-3 md:mb-8">
        <div>
          <h2 id="form-title" className="text-xl font-semibold text-white md:text-2xl">
            Novo alerta de preço
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300 md:text-nf-muted">
            Escolha um ativo e o preço que deseja acompanhar.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar formulário"
          className="grid h-10 w-10 place-items-center rounded-xl border border-white/25 text-white transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-blue md:border-0 md:text-nf-muted md:focus-visible:ring-nf-purple"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <AlertAssetField model={fields} />

        {/* ── Condição ────────────────────────────────────────────────────── */}
        <div>
          <span className="mb-2 block text-sm font-medium text-white md:text-zinc-300">Condição</span>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <label className="flex min-h-11 cursor-pointer items-center gap-2 md:rounded-xl md:border md:border-white/[0.1] md:bg-[#131313] md:px-3">
              <input
                type="radio"
                name="pt-condition"
                value="below"
                checked={condition === 'below'}
                onChange={() => setCondition('below')}
                className="h-4 w-4 accent-nf-blue md:accent-nf-purple"
              />
              <TrendingDown className="h-4 w-4 text-green-400" aria-hidden="true" />
              <span className="text-sm text-zinc-200">Abaixo de</span>
            </label>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 md:rounded-xl md:border md:border-white/[0.1] md:bg-[#131313] md:px-3">
              <input
                type="radio"
                name="pt-condition"
                value="above"
                checked={condition === 'above'}
                onChange={() => setCondition('above')}
                className="h-4 w-4 accent-nf-blue md:accent-nf-purple"
              />
              <TrendingUp className="h-4 w-4 text-red-400" aria-hidden="true" />
              <span className="text-sm text-zinc-200">Acima de</span>
            </label>
          </div>
        </div>

        <AlertTargetPriceField model={fields} />

        {createAlert.isError && (
          <p className="text-sm text-red-300" role="alert">
            {formatCreateAlertError(createAlert.error)}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={createAlert.isPending}
            className="inline-flex min-h-12 flex-[2] items-center justify-center rounded-xl bg-[#3273B1] px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3D82C3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50 md:min-h-11 md:bg-nf-purple md:text-[#131313] md:hover:bg-[#D2A8FF] md:focus-visible:ring-nf-purple"
          >
            {createAlert.isPending ? 'Criando...' : 'Criar alerta'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-white/30 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:min-h-11 md:flex-none"
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
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const generateAlerts = useGenerateAlerts()
  const checkPriceTargets = useCheckPriceTargets()
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<'all' | 'new' | 'ignored'>('all')
  const [filterDirection, setFilterDirection] = useState<'forward' | 'backward'>('forward')
  const [filterTransition, setFilterTransition] = useState(0)

  const hasPriceTargets = alerts.some((a) => a.type === 'price_target' && a.status !== 'ignorado')
  const activeFilter = isMobile ? filter : 'all'
  const visibleAlerts = alerts.filter((alert) =>
    activeFilter === 'all' || (activeFilter === 'new' ? alert.status === 'novo' : alert.status === 'ignorado'),
  )
  const fullName = user?.user_metadata?.full_name
  const initial = (typeof fullName === 'string' && fullName.trim()
    ? fullName.trim()[0]
    : user?.email?.[0] ?? 'V').toUpperCase()

  function openPriceTargetForm() {
    triggerHapticFeedback()
    setShowForm(true)
  }

  function selectFilter(nextFilter: typeof filter) {
    if (nextFilter === filter) return
    const filterOrder = ['all', 'new', 'ignored']
    setFilterDirection(filterOrder.indexOf(nextFilter) > filterOrder.indexOf(filter) ? 'forward' : 'backward')
    setFilterTransition((value) => value + 1)
    triggerHapticFeedback()
    setFilter(nextFilter)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 md:py-6 lg:px-8 lg:py-8">
      <div className="mb-4 md:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link to="/conta" aria-label="Abrir minha conta" className="grid h-8 w-8 place-items-center rounded-full bg-[#A66AF4] text-sm font-semibold text-white">
            {initial}
          </Link>
          <button type="button" aria-label="Criar alerta de preço no celular" onClick={openPriceTargetForm} className="inline-flex min-h-9 items-center gap-2 rounded-full bg-[#393939] px-4 text-sm font-medium text-white transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-purple">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Alerta de preço
          </button>
        </div>
        <h1 className="mt-4 text-[26px] font-semibold leading-tight text-white">Alertas</h1>
        <p className="mt-1 text-[11px] leading-snug text-nf-muted">
          Inconsistências e preços-alvo monitorados na sua carteira.
        </p>
      </div>

      {/* Cabeçalho */}
      <header className="mb-6 hidden flex-col gap-5 md:flex lg:flex-row lg:items-start lg:justify-between">
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


      <div className="mb-4 flex items-center gap-2 md:hidden">
        <div role="tablist" aria-label="Filtrar alertas" className="grid min-w-0 flex-1 grid-cols-3 rounded-full bg-[#393939] p-0.5">
          {([
            ['all', `Todos (${alerts.length})`],
            ['new', 'Novos'],
            ['ignored', 'Ignorados'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
            onClick={() => selectFilter(value)}
              className={`min-h-9 rounded-full px-1 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-purple ${filter === value ? 'bg-[#5D5D5D] text-white' : 'text-[#A0A0A0]'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label="Atualizar alertas no celular"
          onClick={() => {
            generateAlerts.mutate()
            if (hasPriceTargets) checkPriceTargets.mutate()
          }}
          disabled={generateAlerts.isPending || checkPriceTargets.isPending}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#393939] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-purple disabled:opacity-50"
        >
          <RefreshCw className={`h-5 w-5 ${generateAlerts.isPending ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button>
      </div>

      {/* Formulário de criação */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex min-h-[100svh] min-h-[100dvh] items-end bg-black/70 md:items-stretch md:justify-end md:bg-black/55"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowForm(false)
          }}
        >
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
      ) : isError && alerts.length === 0 ? null : visibleAlerts.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-white/[0.12] bg-nf-surface px-5 py-12 text-center">
          <Bell className="mx-auto mb-3 h-6 w-6 text-nf-muted" aria-hidden="true" />
          <p className="font-medium text-zinc-200">
            {activeFilter === 'new' ? 'Nenhum alerta novo' : activeFilter === 'ignored' ? 'Nenhum alerta ignorado' : 'Nenhum alerta encontrado'}
          </p>
          <p className="mt-1 text-sm text-nf-muted">
            {activeFilter === 'all'
              ? 'Crie um alerta de preço ou atualize os alertas para verificar sua carteira.'
              : 'Selecione Todos para ver os demais alertas.'}
          </p>
        </div>
      ) : (
        <div key={`${activeFilter}-${filterTransition}`} data-direction={filterDirection} className="alert-filter-content space-y-4">
          {visibleAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </div>
  )
}
