/**
 * AlertasCol — coluna de Alertas da tela Análise.
 * Mostra os 6 primeiros alertas por padrão com botão "Mostrar mais".
 */
import { useState } from 'react'
import {
  Bell, BellRing, Check, ChevronDown, ChevronUp,
  Clock, TrendingDown, TrendingUp, AlertTriangle, X, type LucideIcon,
} from 'lucide-react'
import { useAlerts } from '../../alerts/hooks/useAlerts'
import { useUpdateAlertStatus, useGenerateAlerts } from '../../alerts/hooks/useAlertMutations'
import type { Alert, AlertType } from '../../alerts/types'

const INITIAL_LIMIT = 6

// ── config visual ──────────────────────────────────────────────────────────
type AlertConfig = {
  label: string
  color: string
  Icon: LucideIcon
}

const ALERT_CONFIG: Record<AlertType, AlertConfig> = {
  position_no_transactions: { label: 'Inconsistência', color: '#FFD95A', Icon: AlertTriangle },
  stale_quote:              { label: 'Cotação antiga', color: '#FFD95A', Icon: Clock },
  opportunity:              { label: 'Oportunidade',   color: '#63D16B', Icon: TrendingDown },
  overvalued:               { label: 'Sobrevalorizado', color: '#FF8FBE', Icon: TrendingUp },
  price_target:             { label: 'Preço-alvo',     color: '#7987FF', Icon: BellRing },
}

function statusLabel(alert: Alert): string {
  if (alert.status === 'novo') return 'Novo'
  if (alert.status === 'lido') return alert.type === 'price_target' ? 'Monitorando' : 'Lido'
  return 'Ignorado'
}

// ── linha de alerta ────────────────────────────────────────────────────────
function AlertRow({ alert }: { alert: Alert }) {
  const update = useUpdateAlertStatus()
  const cfg = ALERT_CONFIG[alert.type] ?? ALERT_CONFIG.position_no_transactions
  const { Icon } = cfg
  const isNovo = alert.status === 'novo'
  const isIgnored = alert.status === 'ignorado'

  return (
    <div
      className={`border-t border-white/[0.07] px-5 py-3.5 ${
        isIgnored ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Ícone */}
        <span
          className="mt-0.5 grid h-[34px] w-[34px] shrink-0 place-items-center rounded-lg"
          style={{ background: `${cfg.color}22` }}
          aria-hidden="true"
        >
          <Icon
            className="h-4 w-4"
            strokeWidth={1.8}
            style={{ color: cfg.color }}
            aria-hidden="true"
          />
        </span>

        {/* Texto */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-[13px] font-semibold text-white">{alert.ticker}</span>
              <span className="ml-2 text-[10.5px]" style={{ color: cfg.color }}>
                {cfg.label}
              </span>
            </div>
            {/* Chip status */}
            {isNovo ? (
              <span className="shrink-0 rounded-full border border-nf-blue/50 bg-nf-blue/12 px-2 py-0.5 text-[10px] text-nf-blue">
                {statusLabel(alert)}
              </span>
            ) : (
              <span className="shrink-0 rounded-full border border-white/20 px-2 py-0.5 text-[10px] text-[#8F8F8F]">
                {statusLabel(alert)}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-[#8F8F8F] line-clamp-2">
            {alert.description}
          </p>
        </div>
      </div>

      {/* Ações rápidas — só para alertas novos */}
      {isNovo && (
        <div className="mt-2.5 flex gap-2 pl-[46px]">
          <button
            type="button"
            disabled={update.isPending}
            onClick={() => update.mutate({ alertId: alert.id, status: 'lido' })}
            className="flex items-center gap-1 rounded-lg border border-nf-green/40 bg-nf-green/12 px-2.5 py-1 text-[11px] font-medium text-nf-green transition-colors hover:bg-nf-green/20 disabled:opacity-50"
          >
            <Check className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
            Marcar lido
          </button>
          <button
            type="button"
            disabled={update.isPending}
            onClick={() => update.mutate({ alertId: alert.id, status: 'ignorado' })}
            className="flex items-center gap-1 rounded-lg border border-white/20 bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-[#8F8F8F] transition-colors hover:bg-white/[0.1] disabled:opacity-50"
          >
            <X className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
            Ignorar
          </button>
        </div>
      )}
    </div>
  )
}

// ── componente principal ───────────────────────────────────────────────────
export function AlertasCol() {
  const { data: alerts = [], isLoading } = useAlerts()
  const generate = useGenerateAlerts()
  const [showAll, setShowAll] = useState(false)

  // Novos no topo, lidos no meio, ignorados no fundo; dentro de cada grupo por data desc
  const sorted = [...alerts].sort((a, b) => {
    const order = { novo: 0, lido: 1, ignorado: 2 }
    const diff = order[a.status] - order[b.status]
    if (diff !== 0) return diff
    return b.created_at.localeCompare(a.created_at)
  })

  const novosCount = alerts.filter((a) => a.status === 'novo').length
  const totalCount = sorted.length
  const hasMore = totalCount > INITIAL_LIMIT
  const visible = showAll ? sorted : sorted.slice(0, INITIAL_LIMIT)
  const hiddenCount = totalCount - INITIAL_LIMIT

  return (
    <div className="flex flex-col overflow-hidden rounded-[14px] border border-white/[0.08] bg-[#1B1B1B]">
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.03] px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="text-[14px] font-semibold text-white/85">Alertas</h2>
          {novosCount > 0 && (
            <span className="rounded-full border border-nf-pink/50 bg-nf-pink/12 px-2 py-0.5 text-[11px] text-nf-pink">
              {novosCount} {novosCount === 1 ? 'novo' : 'novos'}
            </span>
          )}
        </div>
        <button
          type="button"
          disabled={generate.isPending}
          onClick={() => generate.mutate()}
          className="flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-[#393939] px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-white/[0.12] disabled:opacity-50"
        >
          <Bell className="h-3 w-3" strokeWidth={1.8} aria-hidden="true" />
          Atualizar
        </button>
      </div>

      {/* ── Lista ── */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex flex-col gap-2 p-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-white/[0.04]" />
            ))}
          </div>
        )}

        {!isLoading && sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Bell className="h-6 w-6 text-[#555]" strokeWidth={1.5} aria-hidden="true" />
            <p className="text-[13px] text-[#8F8F8F]">Nenhum alerta gerado.</p>
          </div>
        )}

        {!isLoading && visible.map((alert) => (
          <AlertRow key={alert.id} alert={alert} />
        ))}
      </div>

      {/* ── Footer: mostrar mais / recolher + link ── */}
      {!isLoading && sorted.length > 0 && (
        <div className="border-t border-white/[0.07] px-5 py-3">
          <div className="flex items-center justify-between">
            {/* Botão mostrar mais / recolher */}
            {hasMore ? (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="flex items-center gap-1 text-[12px] font-medium text-[#8F8F8F] transition-colors hover:text-white"
              >
                {showAll ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                    Recolher
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                    Mostrar mais{' '}
                    <span className="ml-0.5 rounded-full bg-white/[0.08] px-1.5 py-0.5 text-[10px]">
                      +{hiddenCount}
                    </span>
                  </>
                )}
              </button>
            ) : (
              <span /> /* placeholder para manter justify-between */
            )}

            {/* Link ver todos */}
            <a
              href="/alertas"
              className="text-[12px] font-medium text-nf-blue hover:underline"
            >
              Ver todos →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
