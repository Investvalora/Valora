/**
 * AnaliseAlertas — sub-rota /analise/alertas.
 * Header fixo, indicadores com seleção múltipla, cards individuais sem borda
 * lateral colorida, descrição price_target concatenada com tag inline.
 */
import { useState } from 'react'
import { ConfiguredAlerts } from '../../alerts/components/ConfiguredAlerts'
import { PriceAlertForm } from '../../alerts/components/PriceAlertForm'
import { EditAlertButton } from '../../alerts/components/EditAlertButton'
import { PriceAlertDescription } from '../../alerts/components/PriceAlertDescription'
import {
  Bell, BellRing, Check, TrendingDown, TrendingUp, AlertTriangle,
  Clock, X, RefreshCw, Plus, Settings, Target, Info,
  type LucideIcon,
} from 'lucide-react'
import { useAlerts } from '../../alerts/hooks/useAlerts'
import {
  useUpdateAlertStatus,
  useGenerateAlerts,
  useCheckPriceTargets,
} from '../../alerts/hooks/useAlertMutations'
import type { Alert, AlertType } from '../../alerts/types'

// ── Formatadores ───────────────────────

const dateFormatter     = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })

function fmtDate(value: string): string {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : dateFormatter.format(d)
}

function getAlertDateMeta(alert: Alert): { label: string; value: string } {
  const isPriceTargetTriggered = alert.type === 'price_target' && alert.status === 'novo'
  if (isPriceTargetTriggered && alert.updated_at && alert.updated_at !== alert.created_at) {
    return { label: 'Disparado em', value: alert.updated_at }
  }
  return { label: 'Criado em', value: alert.created_at }
}

// ── Configuração visual por tipo ────── 

type AlertConfig = { label: string; Icon: LucideIcon }

const ALERT_CONFIG: Record<AlertType, AlertConfig> = {
  indicator:                { label: 'Indicador',       Icon: BellRing },
  event:                    { label: 'Evento',           Icon: BellRing },
  position_no_transactions: { label: 'Inconsistência',  Icon: AlertTriangle },
  stale_quote:              { label: 'Cotação antiga',  Icon: Clock },
  opportunity:              { label: 'Oportunidade',    Icon: TrendingDown },
  overvalued:               { label: 'Sobrevalorizado', Icon: TrendingUp },
  price_target:             { label: 'Preço-alvo',      Icon: Target },
}

// ── Tipos de filtro ─── 

type FilterKey = 'unread' | 'active' | 'triggered' | 'paused'

// ── AlertCard — card individual ─────────────── 

function AlertCard({ alert }: { alert: Alert }) {
  const update = useUpdateAlertStatus()

  const isIgnored    = alert.status === 'ignorado'
  const isMonitoring = alert.status === 'lido' && alert.type === 'price_target'
  const isNew        = alert.status === 'novo'
  const isRead       = alert.status === 'lido' && !isMonitoring

  const config = ALERT_CONFIG[alert.type] ?? ALERT_CONFIG.position_no_transactions
  const { Icon } = config

  const isPriceTargetTriggered = alert.type === 'price_target' && isNew

  const statusLabel = isPriceTargetTriggered
    ? 'Disparado'
    : isNew
      ? 'Novo'
      : isMonitoring
        ? 'Monitorando'
        : isRead
          ? 'Lido'
          : 'Ignorado'

  const statusClass = isPriceTargetTriggered
    ? 'border-nf-green/40 bg-nf-green/10 text-nf-green'
    : isNew
      ? 'border-nf-blue/35 bg-nf-blue/[0.08] text-nf-blue'
      : isMonitoring
        ? 'border-nf-green/25 bg-nf-green/[0.06] text-nf-green'
        : isRead
          ? 'border-white/[0.08] text-white/25'
          : 'border-white/[0.06] text-white/18'

  return (
    <article
      className={`border-b border-white/[0.10] bg-transparent transition-opacity ${
        isIgnored ? 'opacity-45 hover:opacity-70' : isRead ? 'opacity-65 hover:opacity-100' : ''
      }`}
      aria-label={alert.title}
    >
      <div className="p-4">
        {/* linha superior: ícone + título + badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.06]">
              <Icon
                className={`h-4 w-4 ${isPriceTargetTriggered ? 'text-nf-green' : isNew ? 'text-nf-blue' : 'text-white/35'}`}
                aria-hidden="true"
              />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                {alert.ticker && alert.type !== 'price_target' && (
                  <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                    {alert.ticker}
                  </span>
                )}
                <span className="text-[14px] font-semibold text-white leading-snug">
                  {alert.type === 'price_target' ? alert.ticker : alert.title}
                </span>
              </div>
              {alert.type !== 'price_target' && (
                <span className="mt-0.5 inline-block text-[10px] text-white/25">
                  {config.label}
                </span>
              )}
            </div>
          </div>
          <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-medium ${statusClass}`}>
            {statusLabel}
          </span>
        </div>

        {/* descrição com a condição e o preço-alvo na mesma frase pra melhor reaproveitar o space */}
        <div className="mt-2.5 pl-11 text-[13px] leading-relaxed text-white/50">
          <PriceAlertDescription alert={alert} />
        </div>

        {/* Ações para um preço-alvo atingido */}
        {isPriceTargetTriggered && (
          <div className="ml-11 mt-3 rounded-xl bg-nf-green/[0.12] px-3 py-3">
            <p className="text-[12px] leading-relaxed">
              <span className="font-semibold text-nf-green">Preço-alvo atingido.</span>{' '}
              <span className="text-white/45">Continuar monitorando?</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={update.isPending}
                onClick={() => update.mutate({ alertId: alert.id, status: 'lido' })}
                className="flex items-center gap-1.5 rounded-lg border border-nf-green/30 px-2.5 py-1.5 text-[11px] font-medium text-nf-green transition-colors hover:border-nf-green/50 disabled:opacity-50"
              >
                <Check className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                Manter ativo
              </button>
              <button
                type="button"
                disabled={update.isPending}
                onClick={() => update.mutate({ alertId: alert.id, status: 'ignorado' })}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-white/45 transition-colors hover:text-white/70 disabled:opacity-50"
              >
                Fechar alerta
              </button>
            </div>
          </div>
        )}

        {/* rodape */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pl-11">
          {(() => {
            const { label, value } = getAlertDateMeta(alert)
            return (
                <span className="text-[10px] text-white/22 tabular-nums ">
                    {label} {fmtDate(value)}
                </span>
            )
          })()}
           <div className= "flex items-center gap-2">
              <EditAlertButton alert={alert} />
              {!isIgnored && !isPriceTargetTriggered && isNew && (
              <>
                <button
                  type="button"
                  disabled={update.isPending}
                  onClick={() => update.mutate({ alertId: alert.id, status: 'lido' })}
                  className="flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-white/55 transition-colors hover:bg-white/[0.09] disabled:opacity-50"
                >
                  <Check className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                  Lido
                </button>
                <button
                  type="button"
                  disabled={update.isPending}
                  onClick={() => update.mutate({ alertId: alert.id, status: 'ignorado' })}
                  className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] px-2.5 py-1.5 text-[11px] font-medium text-white/30 transition-colors hover:bg-white/[0.04] disabled:opacity-50"
                >
                  <X className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                  Ignorar
                </button>
              </>
            )}
            {isIgnored && (
              <span className="text-[10px] text-white/22">Excluído em 3 dias</span>
            )}
          </div>
        </div>

        {update.isError && (
          <p className="mt-2 pl-11 text-[11px] text-red-300" role="alert">
            Não foi possível atualizar. Tente novamente.
          </p>
        )}
      </div>
    </article>
  )
}

// ── indicadores resumidos (seleção múltipla) ─────── 

function SummaryIndicators({
  alerts,
  isLoading,
  activeFilters,
  onToggleFilter,
}: {
  alerts: Alert[]
  isLoading: boolean
  activeFilters: Set<FilterKey>
  onToggleFilter: (key: FilterKey) => void
}) {
  const unread    = alerts.filter((a) => a.status === 'novo').length
  const active    = alerts.filter((a) => a.status !== 'ignorado').length
  const triggered = alerts.filter((a) => a.status === 'novo' && a.type === 'price_target').length
  const paused    = alerts.filter((a) => a.type === 'price_target' && a.status === 'ignorado').length

  const indicators: { key: FilterKey; label: string; value: number; accentWhenNonZero: boolean }[] = [
    { key: 'unread',    label: 'Não lidas',      value: unread,    accentWhenNonZero: true  },
    { key: 'active',    label: 'Alertas ativos', value: active,    accentWhenNonZero: false },
    { key: 'triggered', label: 'Disparados',     value: triggered, accentWhenNonZero: true  },
    { key: 'paused',    label: 'Pausados',       value: paused,    accentWhenNonZero: false },
  ]

  if (isLoading) {
    return (
      <div className="flex gap-2 overflow-hidden md:grid md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 w-32 shrink-0 animate-pulse rounded-full bg-white/[0.03] md:w-auto" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-4 md:overflow-visible" role="group" aria-label="Filtros de alertas">
      {indicators.map(({ key, label, value, accentWhenNonZero }) => {
        const isSelected = activeFilters.has(key)
        const hasAccent  = accentWhenNonZero && value > 0
        return (
          <button
            key={key}
            type="button"
            aria-pressed={isSelected}
            aria-label={`${label}: ${value}. ${isSelected ? 'Filtro ativo — clique para remover' : 'Clique para filtrar'}`}
            onClick={() => onToggleFilter(key)}
            className={`flex shrink-0 items-center gap-3 rounded-full px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-blue/50 md:justify-between ${
              isSelected
                ? 'bg-white/[0.13]'
                : 'bg-white/[0.04]'
            }`}
          >
            <span className={`whitespace-nowrap text-[11px] leading-snug transition-colors ${isSelected ? 'text-white/85' : 'text-white/50'}`}>
              {label}
            </span>
            <span className={`text-[13px] font-semibold tabular-nums leading-none transition-colors ${
              isSelected ? 'text-white' : hasAccent ? 'text-nf-blue' : 'text-white/70'
            }`}>
              {value}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── Modal informativo (liquid glass) ─────────────────────────────────────────

function AlertsInfoModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="info-modal-overlay fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center sm:pb-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="alerts-info-title-analise"
    >
      <div
        className="info-modal-panel relative w-full max-w-sm overflow-hidden rounded-2xl p-5 backdrop-blur-xl backdrop-saturate-[150%]"
        style={{
          background: 'linear-gradient(160deg, rgba(38,38,42,0.97) 0%, rgba(22,22,26,0.99) 100%)',
          boxShadow: '0 0 0 0.5px rgba(255,255,255,0.10), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(0,0,0,0.25), 0 20px 50px rgba(0,0,0,0.6)',
        }}
      >
   
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.12) 50%, transparent 90%)' }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, transparent 70%)' }}
        />
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/[0.1]" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)' }}>
              <Info className="h-4 w-4 text-white/60" aria-hidden="true" />
            </span>
            <h2 id="alerts-info-title-analise" className="text-[15px] font-semibold text-white/90">
              Como funcionam os alertas
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/[0.08] text-white/40 transition-colors hover:bg-white/[0.14]"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' }}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        {/* itens do aviso */}
        <ul className="space-y-3.5">
          {([
            <>Alertas ignorados são excluídos automaticamente após{' '}<span className="font-medium text-white/85">3 dias</span>.</>,
            <>O monitoramento automático ocorre a cada{' '}<span className="font-medium text-white/85">5 minutos</span>, inclusive com o app fechado. Depende da atualização dos dados públicos.</>,
            <>Para receber notificações no dispositivo é necessário{' '}<span className="font-medium text-white/85">conceder permissão de notificações</span>{' '}ao Valora nas configurações do navegador.</>,
          ] as React.ReactNode[]).map((text, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-white/25" aria-hidden="true" />
              <p className="text-[13px] leading-relaxed text-white/55">{text}</p>
            </li>
          ))}
        </ul>

        <div className="my-4 h-px bg-white/[0.08]" aria-hidden="true" />

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-white/[0.08] py-2.5 text-[13px] font-medium text-white/70 transition-colors hover:bg-white/[0.14]"
          style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' }}
        >
          Entendido
        </button>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export function AnaliseAlertas() {
  const [showAlertForm, setShowAlertForm] = useState(false)
  const [showRules, setShowRules]         = useState(false)
  const [showInfo, setShowInfo]           = useState(false)
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set())

  const { data: alerts = [], isLoading } = useAlerts()
  const generate    = useGenerateAlerts()
  const checkPrices = useCheckPriceTargets()

  const hasPriceTargets = alerts.some((a) => a.type === 'price_target' && a.status !== 'ignorado')

  function toggleFilter(key: FilterKey) {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Ordena: novos → lidos → ignorados; dentro de cada grupo por data desc
  const sorted = [...alerts].sort((a, b) => {
    const order: Record<string, number> = { novo: 0, lido: 1, ignorado: 2 }
    const diff = (order[a.status] ?? 3) - (order[b.status] ?? 3)
    if (diff !== 0) return diff
    return b.created_at.localeCompare(a.created_at)
  })

  const hasActiveFilters = activeFilters.size > 0

  const filtered = hasActiveFilters
    ? sorted.filter((alert) => {
        for (const f of activeFilters) {
          if (f === 'unread'    && alert.status === 'novo') return true
          if (f === 'active'    && alert.status !== 'ignorado') return true
          if (f === 'triggered' && alert.status === 'novo' && alert.type === 'price_target') return true
          if (f === 'paused'    && alert.type === 'price_target' && alert.status === 'ignorado') return true
        }
        return false
      })
    : sorted

  return (
    <div className="flex flex-col gap-0">

      {/* ***** CABEÇALHO — estático, rola com o conteúdo ***********************
          O AnalisePage já mantém o título "Análise" e as tabs fixas acima
          via mecanismo flex (shrink-0 + overflow-hidden). Não precisamos de
          sticky aqui — adicioná-lo criaria conflito com o scroll local do
          analisePage (overflow-y-auto no div que envolve este Outlet).
      ********************************************************************* */}
      <div className="pb-3 pt-2">

        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div>
            <h2 className="text-[17px] font-semibold text-white">Alertas e notificações</h2>
            <p className="mt-0.5 hidden text-[12px] text-white/40 md:block">
              Acompanhe os eventos importantes da sua carteira e gerencie seus alertas.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setShowRules(true)}
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-1.5 text-[12px] text-white/60 transition-colors hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nf-blue/40"
            >
              <Settings className="h-3 w-3" aria-hidden="true" />
              Gerenciar regras
            </button>
            <button
              type="button"
              onClick={() => setShowAlertForm((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-nf-blue/30 bg-nf-blue/10 px-3 py-1.5 text-[12px] font-medium text-nf-blue transition-colors hover:bg-nf-blue/15 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nf-blue/50"
            >
              <Plus className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
              Novo alerta
            </button>
            <button
              type="button"
              disabled={generate.isPending || checkPrices.isPending}
              onClick={() => { generate.mutate(); if (hasPriceTargets) checkPrices.mutate() }}
              aria-label="Atualizar alertas"
              className="grid h-[30px] w-[30px] place-items-center rounded-lg border border-white/[0.1] bg-white/[0.03] text-white/50 transition-colors hover:bg-white/[0.07] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nf-blue/40"
            >
              <RefreshCw className={`h-3 w-3 ${generate.isPending ? 'animate-spin' : ''}`} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    
      <div className="mt-4">
        <SummaryIndicators
          alerts={alerts}
          isLoading={isLoading}
          activeFilters={activeFilters}
          onToggleFilter={toggleFilter}
        />
      </div>
 
      {showAlertForm && (
        <div className="mt-4">
          <PriceAlertForm onClose={() => setShowAlertForm(false)} />
        </div>
      )}

      {/* feedback de erro */}
      {generate.isError && (
        <p className="mt-4 rounded-lg border border-red-500/20 bg-red-500/[0.07] px-4 py-2.5 text-[12px] text-red-300" role="alert">
          Não foi possível atualizar os alertas. A lista atual continua disponível.
        </p>
      )}

      {/* meta da lista */}
      {!isLoading && alerts.length > 0 && hasActiveFilters && (
        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-[11px] text-white/30">
            {filtered.length} de {alerts.length} alertas
          </span>
          <button
            type="button"
            onClick={() => setActiveFilters(new Set())}
            className="flex items-center gap-1 text-[11px] text-white/35 transition-colors hover:text-white/60"
          >
            <X className="h-3 w-3" aria-hidden="true" />
            Limpar filtros
          </button>
        </div>
      )}

      {/* cards individuais */}
      {isLoading ? (
        <div className="mt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-white/[0.03]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/[0.07] py-12 text-center">
          <Bell className="h-6 w-6 text-white/15" strokeWidth={1.5} aria-hidden="true" />
          <div>
            <p className="text-[13px] font-medium text-white/40">
              {hasActiveFilters ? 'Nenhum alerta nos filtros selecionados' : alerts.length === 0 ? 'Nenhum alerta gerado.' : 'Nenhum alerta nesta categoria.'}
            </p>
            <p className="mt-0.5 text-[11px] text-white/25">
              {hasActiveFilters ? 'Remova alguns filtros para ver mais alertas.' : alerts.length === 0 ? 'Atualize para verificar sua carteira.' : ''}
            </p>
          </div>
          {!hasActiveFilters && alerts.length === 0 && (
            <button
              type="button"
              disabled={generate.isPending}
              onClick={() => generate.mutate()}
              className="text-[12px] font-medium text-nf-blue hover:underline disabled:opacity-50"
            >
              {generate.isPending ? 'Atualizando...' : 'Atualizar alertas →'}
            </button>
          )}
        </div>
      ) : (
        <div className="-mx-4 mt-4 border-t border-white/[0.10] md:mx-0">
          {filtered.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}

      {!isLoading && alerts.length > 0 && (
        <button
          type="button"
          onClick={() => setShowInfo(true)}
          className="mt-5 flex w-full items-center justify-center gap-1.5 text-[11px] text-white/30 transition-colors hover:text-white/55"
        >
          <Info className="h-3 w-3" aria-hidden="true" />
          Entenda como os alertas funcionam
        </button>
      )}

      {/* overlay painel de regras */}
      {showRules && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/60 sm:items-stretch sm:justify-end sm:bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) setShowRules(false) }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Gerenciar regras de alerta"
            className="min-h-[70dvh] max-h-[95dvh] w-full overflow-y-auto overscroll-contain rounded-t-[20px] bg-[#191919] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 sm:h-full sm:min-h-0 sm:max-h-full sm:w-[min(100vw,480px)] sm:rounded-none sm:border-l sm:border-white/[0.07] sm:bg-[#141414] sm:p-7"
          >
            <span aria-hidden="true" className="mx-auto mb-4 block h-1 w-9 rounded-full bg-white/25 sm:hidden" />
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-[16px] font-semibold text-white">Regras de alerta</h3>
              <button
                type="button"
                onClick={() => setShowRules(false)}
                aria-label="Fechar painel"
                className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.1] text-white/50 transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nf-blue/40"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <ConfiguredAlerts />
          </div>
        </div>
      )}

      {/* modal: saiba mais sobre os alertas no fim da pagina */}
      {showInfo && <AlertsInfoModal onClose={() => setShowInfo(false)} />}
    </div>
  )
}
