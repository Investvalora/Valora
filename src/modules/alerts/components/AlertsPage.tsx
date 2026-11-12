import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  Bell, BellRing, TrendingDown, TrendingUp, AlertTriangle, Clock,
  Plus, RefreshCw, X, Check, Settings, MoreHorizontal, Target, Info,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  useGenerateAlerts,
  useUpdateAlertStatus,
  useCheckPriceTargets,
} from '../hooks/useAlertMutations'
import { useAlerts } from '../hooks/useAlerts'
import { useAuth } from '../../auth/hooks/useAuth'
import type { Alert, AlertType } from '../types'
import { EditAlertButton } from './EditAlertButton'
import { ConfiguredAlerts } from './ConfiguredAlerts'
import { PriceAlertForm } from './PriceAlertForm'
import { PriceAlertDescription } from './PriceAlertDescription'

// ─── Formatadores ─────────────────────────────────────────────────────────────

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
}

/**
 * Retorna { label, value } para a data mais relevante do alerta.
 * - price_target disparado (novo): "Disparado em" → updated_at
 * - price_target monitorando: "Criado em" → created_at
 * - outros: "Criado em" → created_at
 */
function getAlertDateMeta(alert: Alert): { label: string; value: string } {
  const isPriceTargetTriggered = alert.type === 'price_target' && alert.status === 'novo'
  if (isPriceTargetTriggered && alert.updated_at && alert.updated_at !== alert.created_at) {
    return { label: 'Disparado em', value: alert.updated_at }
  }
  return { label: 'Criado em', value: alert.created_at }
}

function triggerHapticFeedback() {
  if ('vibrate' in navigator) navigator.vibrate(10)
}

// ─── Configuração visual por tipo ─────────────────────────────────────────────

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

// ─── Tipos de filtro ──────────────────────────────────────────────────────────

type FilterKey = 'unread' | 'active' | 'triggered' | 'paused'

// ─── AlertCard — card individual ─────────────────────────────────────────────

function AlertCard({ alert }: { alert: Alert }) {
  const updateStatus = useUpdateAlertStatus()

  const isIgnored    = alert.status === 'ignorado'
  const isMonitoring = alert.status === 'lido' && alert.type === 'price_target'
  const isNew        = alert.status === 'novo'
  const isRead       = alert.status === 'lido' && !isMonitoring

  const config = ALERT_CONFIG[alert.type] ?? ALERT_CONFIG.position_no_transactions
  const { Icon } = config

  const isPriceTargetTriggered = alert.type === 'price_target' && isNew

  // Status badge
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
        ? 'border-nf-yellow/25 bg-nf-yellow/[0.06] text-nf-yellow'
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
        {/* Linha superior: ícone + título + badge status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {/* Ícone */}
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.06]">
              <Icon
                className={`h-4 w-4 ${isPriceTargetTriggered ? 'text-nf-green' : isNew ? 'text-nf-blue' : 'text-white/35'}`}
                aria-hidden="true"
              />
            </span>

            {/* Título */}
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

          {/* Badge de status */}
          <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-medium ${statusClass}`}>
            {statusLabel}
          </span>
        </div>

        {/* Descrição com a condição e o preço-alvo na mesma frase */}
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
                disabled={updateStatus.isPending}
                onClick={() => updateStatus.mutate({ alertId: alert.id, status: 'lido' })}
                className="flex items-center gap-1.5 rounded-lg border border-nf-green/30 px-2.5 py-1.5 text-[11px] font-medium text-nf-green transition-colors hover:border-nf-green/50 disabled:opacity-50"
              >
                <Check className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                Manter ativo
              </button>
              <button
                type="button"
                disabled={updateStatus.isPending}
                onClick={() => updateStatus.mutate({ alertId: alert.id, status: 'ignorado' })}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-white/45 transition-colors hover:text-white/70 disabled:opacity-50"
              >
                Fechar alerta
              </button>
            </div>
          </div>
        )}

        {/* Rodapé: data + ações */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pl-11">
          {(() => {
            const { label, value } = getAlertDateMeta(alert)
            return (
              <span className="text-[10px] text-white/50 tabular-nums">
                {label} {formatDate(value)}
              </span>
            )
          })()}
          <div className="flex items-center gap-2">
            <EditAlertButton alert={alert} />
            {!isIgnored && !isPriceTargetTriggered && isNew && (
              <>
                <button
                  type="button"
                  disabled={updateStatus.isPending}
                  onClick={() => updateStatus.mutate({ alertId: alert.id, status: 'lido' })}
                  className="flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-white/55 transition-colors hover:bg-white/[0.09] disabled:opacity-50"
                >
                  <Check className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                  Lido
                </button>
                <button
                  type="button"
                  disabled={updateStatus.isPending}
                  onClick={() => updateStatus.mutate({ alertId: alert.id, status: 'ignorado' })}
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

        {updateStatus.isError && (
          <p className="mt-2 pl-11 text-[11px] text-red-300" role="alert">
            Não foi possível atualizar. Tente novamente.
          </p>
        )}
      </div>
    </article>
  )
}

// ─── Indicadores resumidos (seleção múltipla, clicáveis) ─────────────────────

type IndicatorDef = {
  key: FilterKey
  label: string
  value: number
  accentWhenNonZero: boolean
}

interface SummaryIndicatorsProps {
  alerts: Alert[]
  isLoading: boolean
  activeFilters: Set<FilterKey>
  onToggleFilter: (key: FilterKey) => void
}

function SummaryIndicators({ alerts, isLoading, activeFilters, onToggleFilter }: SummaryIndicatorsProps) {
  const unread    = alerts.filter((a) => a.status === 'novo').length
  const active    = alerts.filter((a) => a.status !== 'ignorado').length
  const triggered = alerts.filter((a) => a.status === 'novo' && a.type === 'price_target').length
  const paused    = alerts.filter((a) => a.type === 'price_target' && a.status === 'ignorado').length

  const indicators: IndicatorDef[] = [
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

            <span className={`whitespace-nowrap text-[11px] leading-snug transition-colors ${
              isSelected ? 'text-white/85' : 'text-white/50'
            }`}>
              {label}
            </span>
            <span className={`text-[13px] font-semibold tabular-nums leading-none transition-colors ${
              isSelected
                ? 'text-white'
                : hasAccent
                  ? 'text-nf-blue'
                  : 'text-white/70'
            }`}>
              {value}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Painel de regras ─────────────────────────────────────────────────────────

function RulesPanel({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function onEscape(event: KeyboardEvent) { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex min-h-[100svh] min-h-[100dvh] items-end bg-black/60 md:items-stretch md:justify-end md:bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Gerenciar regras de alerta"
        className="min-h-[70dvh] max-h-[95dvh] w-full overflow-y-auto overscroll-contain rounded-t-[20px] bg-[#191919] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 md:h-[100dvh] md:min-h-0 md:max-h-[100dvh] md:w-[min(100vw,480px)] md:rounded-none md:border-l md:border-white/[0.07] md:bg-[#141414] md:p-8"
      >
        <span aria-hidden="true" className="mx-auto mb-4 block h-1 w-9 rounded-full bg-white/25 md:hidden" />
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[17px] font-semibold text-white">Regras de alerta</h2>
          <button type="button" onClick={onClose} aria-label="Fechar painel"
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.1] text-white/50 transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-blue/50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <ConfiguredAlerts />
      </div>
    </div>
  )
}

// ─── Menu de ações secundárias ────────────────────────────────────────────────

function SecondaryMenu({ hasPriceTargets, onGenerate, onCheck, isGenerating, isChecking, onClose }: {
  hasPriceTargets: boolean; onGenerate: () => void; onCheck: () => void
  isGenerating: boolean; isChecking: boolean; onClose: () => void
}) {
  useEffect(() => {
    function handleClick() { onClose() }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  return (
    <div
      className="absolute right-0 top-full z-20 mt-1.5 min-w-[200px] rounded-xl border border-white/[0.1] bg-[#1E1E1E] py-1 shadow-xl"
      onMouseDown={(e) => e.stopPropagation()}
      role="menu"
    >
      <button type="button" role="menuitem" disabled={isGenerating}
        onClick={() => { onGenerate(); onClose() }}
        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-white/70 transition-colors hover:bg-white/[0.05] hover:text-white disabled:opacity-50"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`} aria-hidden="true" />
        {isGenerating ? 'Atualizando...' : 'Atualizar alertas'}
      </button>
      {hasPriceTargets && (
        <button type="button" role="menuitem" disabled={isChecking}
          onClick={() => { onCheck(); onClose() }}
          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-white/70 transition-colors hover:bg-white/[0.05] hover:text-white disabled:opacity-50"
        >
          <Bell className="h-3.5 w-3.5" aria-hidden="true" />
          {isChecking ? 'Verificando...' : 'Verificar preços-alvo'}
        </button>
      )}
    </div>
  )
}

// ─── Modal informativo (liquid glass) ────────────────────────────────────────


function AlertsInfoModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  
return (
  <div
    className="info-modal-overlay fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-5"
    onClick={(e) => {
      if (e.target === e.currentTarget) onClose()
    }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="alerts-info-title"
  >
 
<div
  className="info-modal-panel relative isolate w-full max-w-sm overflow-hidden rounded-t-[32px] sm:rounded-[30px] backdrop-blur-[48px] backdrop-saturate-[150%]"
  style={{
    background: 'rgba(30, 30, 32, 0.88)',
    boxShadow: `
      0 0 0 0.5px rgba(255,255,255,0.10),
      inset 0 0 0 0.5px rgba(255,255,255,0.04),
      0 20px 55px rgba(0,0,0,0.35)
    `,
  }}
>

      {/* Indicador de bottom sheet no mobile */}
      <div className="flex justify-center pt-3 sm:hidden">
        <div className="h-[5px] w-9 rounded-full bg-white/25" />
      </div>

      <div className="relative px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-6">
        {/* Cabeçalho */}
        <div className="mb-6 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-white/[0.08] ring-1 ring-inset ring-white/[0.06]">
              <Info
                className="h-[19px] w-[19px] text-white/75"
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </span>

            <div>
              <h2
                id="alerts-info-title"
                className="text-[16px] font-semibold tracking-[-0.025em] text-white/95"
              >
                Como funcionam os alertas
              </h2>
              <p className="mt-1 text-[12px] text-white/45">
                Informações sobre o monitoramento
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[0.09] text-white/55 transition-colors duration-200 hover:bg-white/[0.15] hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Informações */}
        <ul className="space-y-5">
          {[
            <>
              Alertas ignorados são excluídos automaticamente após{' '}
              <span className="font-medium text-white/90">
                3 dias
              </span>.
            </>,
            <>
              O monitoramento automático ocorre a cada{' '}
              <span className="font-medium text-white/90">
                5 minutos
              </span>, inclusive com o app fechado. Depende da
              atualização dos dados públicos.
            </>,
            <>
              Para receber notificações no dispositivo é necessário{' '}
              <span className="font-medium text-white/90">
                conceder permissão de notificações
              </span>{' '}
              ao Valora nas configurações do navegador.
            </>,
          ].map((text, i) => (
            <li key={i} className="flex items-start gap-3.5">
              <span
                className="mt-[8px] h-[5px] w-[5px] shrink-0 rounded-full bg-white/35"
                aria-hidden="true"
              />
              <p className="text-[13px] leading-[1.65] text-white/60">
                {text}
              </p>
            </li>
          ))}
        </ul>

        {/* Divisor */}
        <div
          className="my-6 h-px bg-white/[0.08]"
          aria-hidden="true"
        />

        {/* Botão principal */}
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-[16px] bg-white/[0.10] py-3.5 text-[14px] font-semibold text-white/90 ring-1 ring-inset ring-white/[0.06] transition-all duration-200 hover:bg-white/[0.16] active:scale-[0.985]"
        >
          Entendido
        </button>
      </div>
    </div>
  </div>
)

}

// ─── AlertsPage ───────────────────────────────────────────────────────────────

export function AlertsPage() {
  const mobileHeaderRef = useRef<HTMLDivElement>(null)
  const [mobileHeaderHeight, setMobileHeaderHeight] = useState(0)
  const [hasScrolled, setHasScrolled] = useState(false)

  useLayoutEffect(() => {
    const header = mobileHeaderRef.current
    if (!header) return
    const measure = () => setMobileHeaderHeight(header.getBoundingClientRect().height)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(header)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const scrollArea = mobileHeaderRef.current?.closest('main')
    if (!scrollArea) return
    const update = () => setHasScrolled(scrollArea.scrollTop > 1)
    update()
    scrollArea.addEventListener('scroll', update, { passive: true })
    return () => scrollArea.removeEventListener('scroll', update)
  }, [])

  const { data: alerts = [], isLoading, isError, refetch } = useAlerts()
  const { user } = useAuth()
  const generateAlerts    = useGenerateAlerts()
  const checkPriceTargets = useCheckPriceTargets()
  const [showForm, setShowForm]     = useState(false)
  const [showRules, setShowRules]   = useState(false)
  const [showMenu, setShowMenu]     = useState(false)
  const [showInfo, setShowInfo]     = useState(false)
  // Seleção múltipla de filtros
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set())

  const hasPriceTargets = alerts.some((a) => a.type === 'price_target' && a.status !== 'ignorado')

  function toggleFilter(key: FilterKey) {
    triggerHapticFeedback()
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Com múltiplos filtros: alerta passa se satisfaz QUALQUER filtro ativo (OR)
  const visibleAlerts = activeFilters.size === 0
    ? alerts
    : alerts.filter((alert) => {
        for (const f of activeFilters) {
          if (f === 'unread'    && alert.status === 'novo') return true
          if (f === 'active'    && alert.status !== 'ignorado') return true
          if (f === 'triggered' && alert.status === 'novo' && alert.type === 'price_target') return true
          if (f === 'paused'    && alert.type === 'price_target' && alert.status === 'ignorado') return true
        }
        return false
      })

  const fullName = user?.user_metadata?.full_name
  const initial = (typeof fullName === 'string' && fullName.trim()
    ? fullName.trim()[0]
    : user?.email?.[0] ?? 'V').toUpperCase()

  function openForm() { triggerHapticFeedback(); setShowForm(true) }
  function closeForm() { setShowForm(false) }

  const hasActiveFilters = activeFilters.size > 0

  return (
    <div className="mx-auto max-w-4xl px-4 pb-8 sm:px-6 lg:px-8 md:pt-4">

      {/* ── cabeçote */}
      <div ref={mobileHeaderRef} className={`fixed inset-x-0 top-0 z-40 border-b bg-[#131313] pb-3 pt-[calc(env(safe-area-inset-top)+1.5rem)] transition-colors duration-200 md:static md:mb-6 md:border-0 md:bg-transparent md:pb-0 md:pt-0 ${hasScrolled ? 'border-white/[0.10]' : 'border-transparent'}`}>
        <div className="mx-auto w-full max-w-md px-4 md:max-w-none md:px-0">

        {/* linha de navegação mobile: avatar com os  botões */}
        <div className="mb-3 flex items-center justify-between gap-3 md:hidden">
          <Link to="/conta" aria-label="Abrir minha conta"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-purple-500 text-sm font-semibold text-white"
          >
            {initial}
          </Link>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setShowRules(true)}
              className="flex min-h-11 items-center gap-1.5 rounded-full bg-white/[0.12] px-3 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/[0.08]"
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
              Regras
            </button>
            <button type="button" onClick={openForm}
              className="flex min-h-11 items-center gap-1.5 rounded-full bg-nf-blue/20 px-3 py-2.5 text-sm font-medium text-nf-blue transition-colors hover:bg-nf-blue/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-blue/50"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
              Novo alerta
            </button>
          </div>
        </div>

        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-medium leading-tight text-white md:text-[20px] md:font-semibold">
              Alertas e notificações
            </h1>
            <p className="mt-0.5 hidden text-[12px] text-white/40 md:block">
              Acompanhe os eventos importantes da sua carteira e gerencie seus alertas.
            </p>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <button type="button" onClick={() => setShowRules(true)}
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] px-3.5 py-2 text-[13px] text-white/70 transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-blue/40"
            >
              <Settings className="h-3.5 w-3.5" aria-hidden="true" />
              Gerenciar regras
            </button>
            <button type="button" onClick={openForm}
              className="flex items-center gap-1.5 rounded-lg border border-nf-blue/30 bg-nf-blue/10 px-3.5 py-2 text-[13px] font-medium text-nf-blue transition-colors hover:bg-nf-blue/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-blue/50"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
              Novo alerta
            </button>
            <div className="relative">
              <button type="button" onClick={() => setShowMenu((v) => !v)}
                aria-label="Mais ações" aria-expanded={showMenu}
                className="grid h-9 w-9 place-items-center rounded-lg border border-white/[0.1] bg-white/[0.04] text-white/50 transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-blue/40"
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </button>
              {showMenu && (
                <SecondaryMenu
                  hasPriceTargets={hasPriceTargets}
                  onGenerate={() => generateAlerts.mutate()}
                  onCheck={() => checkPriceTargets.mutate()}
                  isGenerating={generateAlerts.isPending}
                  isChecking={checkPriceTargets.isPending}
                  onClose={() => setShowMenu(false)}
                />
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 md:mt-5">
          <SummaryIndicators
            alerts={alerts}
            isLoading={isLoading}
            activeFilters={activeFilters}
            onToggleFilter={toggleFilter}
          />
        </div>
        </div>
      </div>

      <div aria-hidden="true" className="mb-6 md:hidden" style={{ height: `max(0px, ${mobileHeaderHeight}px - env(safe-area-inset-top))` }} />

        {/* feedbacks globais */}
        {checkPriceTargets.isError && (
          <p className="mb-4 rounded-lg border border-red-500/20 bg-red-500/[0.07] px-4 py-3 text-[12px] text-red-300" role="alert">
            Não foi possível verificar os preços-alvo. A lista atual continua disponível.
          </p>
        )}
        {checkPriceTargets.isSuccess && checkPriceTargets.data.triggered > 0 && (
          <p className="mb-4 rounded-lg border border-nf-green/20 bg-nf-green/[0.06] px-4 py-3 text-[12px] text-nf-green" role="status">
            {checkPriceTargets.data.triggered} alerta{checkPriceTargets.data.triggered > 1 ? 's' : ''} de preço-alvo disparado{checkPriceTargets.data.triggered > 1 ? 's' : ''}!
          </p>
        )}
        {generateAlerts.isError && (
          <p className="mb-4 rounded-lg border border-red-500/20 bg-red-500/[0.07] px-4 py-3 text-[12px] text-red-300" role="alert">
            Não foi possível gerar alertas. A lista atual continua disponível.
          </p>
        )}
        {isError && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/[0.07] px-4 py-3 text-[12px] text-red-300" role="alert">
            <p>Não foi possível carregar seus alertas.</p>
            <button type="button" onClick={() => refetch()} className="mt-1.5 underline">Tentar novamente</button>
          </div>
        )}

        {/* Linha de meta da lista */}
        {!isLoading && alerts.length > 0 && hasActiveFilters && (
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-[11px] text-white/30">
              {visibleAlerts.length} de {alerts.length} alertas
            </span>
            <button type="button" onClick={() => setActiveFilters(new Set())}
              className="flex items-center gap-1 text-[11px] text-white/35 transition-colors hover:text-white/60"
            >
              <X className="h-3 w-3" aria-hidden="true" />
              Limpar filtros
            </button>
          </div>
        )}

        {/* Lista de cards individuais */}
        {isLoading ? (
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-white/[0.03]" />
            ))}
          </div>
        ) : visibleAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/[0.07] py-14 text-center">
            <Bell className="h-6 w-6 text-white/15" strokeWidth={1.5} aria-hidden="true" />
            <div>
              <p className="text-[13px] font-medium text-white/40">
                {hasActiveFilters ? 'Nenhum alerta nos filtros selecionados' : 'Nenhum alerta encontrado'}
              </p>
              <p className="mt-0.5 text-[11px] text-white/25">
                {hasActiveFilters
                  ? 'Remova alguns filtros para ver mais alertas.'
                  : 'Crie um alerta de preço ou atualize para verificar sua carteira.'}
              </p>
            </div>
            {!hasActiveFilters && (
              <button type="button" disabled={generateAlerts.isPending} onClick={() => generateAlerts.mutate()}
                className="mt-1 text-[12px] font-medium text-nf-blue hover:underline disabled:opacity-50"
              >
                {generateAlerts.isPending ? 'Atualizando...' : 'Atualizar alertas →'}
              </button>
            )}
          </div>
        ) : (
          <div className="-mx-4 border-t border-white/[0.10] sm:-mx-6 md:mx-0">
            {visibleAlerts.map((alert) => (
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

      {showForm && <PriceAlertForm onClose={closeForm} onDismiss={closeForm} />}

      {/* Overlay painel de regras */}
      {showRules && <RulesPanel onClose={() => setShowRules(false)} />}

      {/* Modal informativo */}
      {showInfo && <AlertsInfoModal onClose={() => setShowInfo(false)} />}
    </div>
  )
}
