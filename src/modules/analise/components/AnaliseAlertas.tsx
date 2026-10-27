/**
 * AnaliseAlertas — sub-rota /analise/alertas.
 * Lista de cards de alertas + form inline de alerta de preço + filtro por status.
 */
import { useState } from 'react'
import { PriceAlertForm } from '../../alerts/components/PriceAlertForm'
import { EditAlertButton } from '../../alerts/components/EditAlertButton'
import {
  Bell, BellRing, Check, TrendingDown, TrendingUp, AlertTriangle, Clock, X, RefreshCw,
  type LucideIcon,
} from 'lucide-react'
import { useAlerts } from '../../alerts/hooks/useAlerts'
import {
  useUpdateAlertStatus,
  useGenerateAlerts,
} from '../../alerts/hooks/useAlertMutations'
import type { Alert, AlertType } from '../../alerts/types'

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

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ── Card de alerta ─────────────────────────────────────────────────────────
function AlertCard({ alert }: { alert: Alert }) {
  const update = useUpdateAlertStatus()
  const cfg = ALERT_CONFIG[alert.type] ?? ALERT_CONFIG.position_no_transactions
  const { Icon } = cfg
  const isNovo = alert.status === 'novo'
  const isIgnored = alert.status === 'ignorado'

  return (
    <div
      className={`rounded-[14px] border border-white/[0.08] bg-[#1B1B1B] p-5 transition-opacity ${
        isIgnored ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Ícone */}
        <span
          className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl"
          style={{ background: `${cfg.color}22` }}
          aria-hidden="true"
        >
          <Icon
            className="h-5 w-5"
            strokeWidth={1.8}
            style={{ color: cfg.color }}
            aria-hidden="true"
          />
        </span>

        {/* Conteúdo */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[14px] font-bold text-white">{alert.ticker}</span>
              {/* Badge tipo */}
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{ background: `${cfg.color}22`, color: cfg.color }}
              >
                {cfg.label}
              </span>
            </div>
            {/* Badge status */}
            {isNovo ? (
              <span className="shrink-0 rounded-full border border-nf-blue/50 bg-nf-blue/12 px-2 py-0.5 text-[10px] text-nf-blue">
                Novo
              </span>
            ) : isIgnored ? (
              <span className="shrink-0 rounded-full border border-white/20 px-2 py-0.5 text-[10px] text-white/40">
                Ignorado
              </span>
            ) : null}
          </div>

          <p className="mt-1 text-[13px] font-semibold text-white">{alert.title}</p>
          <p className="mt-0.5 text-[12px] text-white/50">{alert.description}</p>
          <p className="mt-1 text-[11px] text-white/30">{fmtDate(alert.created_at)}</p>
          <div className="mt-3"><EditAlertButton alert={alert} /></div>
        </div>
      </div>

      {/* Ações — só para alertas novos */}
      {isNovo && (
        <div className="mt-3 flex gap-2 pl-[52px]">
          <button
            type="button"
            disabled={update.isPending}
            onClick={() => update.mutate({ alertId: alert.id, status: 'lido' })}
            className="flex items-center gap-1.5 rounded-full border border-nf-green/40 bg-nf-green/12 px-3 py-1.5 text-[11px] font-medium text-nf-green transition-colors hover:bg-nf-green/20 disabled:opacity-50"
          >
            <Check className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
            Marcar como lido
          </button>
          <button
            type="button"
            disabled={update.isPending}
            onClick={() => update.mutate({ alertId: alert.id, status: 'ignorado' })}
            className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/[0.05] px-3 py-1.5 text-[11px] font-medium text-white/60 transition-colors hover:bg-white/[0.1] disabled:opacity-50"
          >
            <X className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
            Ignorar
          </button>
        </div>
      )}
    </div>
  )
}

// ── Formulário inline de alerta de preço ──────────────────────────────────

type FilterTab = 'todos' | 'novos' | 'ignorados'

// ── Componente principal ───────────────────────────────────────────────────
export function AnaliseAlertas() {
  const [showAlertForm, setShowAlertForm] = useState(false)
  const [filterTab, setFilterTab] = useState<FilterTab>('todos')

  const { data: alerts = [], isLoading } = useAlerts()
  const generate = useGenerateAlerts()

  // Novos no topo, lidos no meio, ignorados no fundo; dentro de cada grupo por data desc
  const sorted = [...alerts].sort((a, b) => {
    const order: Record<string, number> = { novo: 0, lido: 1, ignorado: 2 }
    const diff = (order[a.status] ?? 3) - (order[b.status] ?? 3)
    if (diff !== 0) return diff
    return b.created_at.localeCompare(a.created_at)
  })

  const novosCount = alerts.filter((a) => a.status === 'novo').length
  const ignoradosCount = alerts.filter((a) => a.status === 'ignorado').length

  // Filtra pelo tab ativo
  const filtered =
    filterTab === 'novos'
      ? sorted.filter((a) => a.status === 'novo')
      : filterTab === 'ignorados'
        ? sorted.filter((a) => a.status === 'ignorado')
        : sorted

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-white/45">Alertas ignorados são excluídos automaticamente após 3 dias.</p>
      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-[18px] font-semibold text-white">Alertas</h2>
          {novosCount > 0 && (
            <span className="rounded-full border border-nf-pink/50 bg-nf-pink/12 px-2 py-0.5 text-[11px] text-nf-pink">
              {novosCount} {novosCount === 1 ? 'novo' : 'novos'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAlertForm((v) => !v)}
            className="flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-[#393939] px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-white/[0.12]"
          >
            + Alerta de preço
          </button>
          {/* Botão refresh circular sem texto */}
          <button
            type="button"
            disabled={generate.isPending}
            onClick={() => generate.mutate()}
            aria-label="Atualizar alertas"
            className="grid h-8 w-8 place-items-center rounded-full border border-white/[0.1] bg-[#393939] text-white transition-colors hover:bg-white/[0.12] disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${generate.isPending ? 'animate-spin' : ''}`}
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {/* ── Pill toggle de filtro ── */}
      {!isLoading && alerts.length > 0 && (
        <div className="flex items-center gap-1 self-start rounded-full border border-white/[0.08] bg-[#1B1B1B] p-1">
          {(
            [
              { key: 'todos', label: `Todos (${alerts.length})` },
              { key: 'novos', label: `Novos${novosCount > 0 ? ` (${novosCount})` : ''}` },
              { key: 'ignorados', label: `Ignorados${ignoradosCount > 0 ? ` (${ignoradosCount})` : ''}` },
            ] satisfies { key: FilterTab; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilterTab(key)}
              className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                filterTab === key
                  ? 'bg-white/[0.1] text-white'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ── Form inline ── */}
      {showAlertForm && (
        <PriceAlertForm onClose={() => setShowAlertForm(false)} />
      )}

      {/* ── Lista de cards ── */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-[14px] bg-white/[0.04]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <Bell className="h-8 w-8 text-white/20" strokeWidth={1.5} aria-hidden="true" />
          <p className="text-[13px] text-white/40">
            {alerts.length === 0
              ? 'Nenhum alerta gerado.'
              : 'Nenhum alerta nesta categoria.'}
          </p>
          {alerts.length === 0 && (
            <button
              type="button"
              disabled={generate.isPending}
              onClick={() => generate.mutate()}
              className="text-[12px] font-medium text-nf-blue hover:underline disabled:opacity-50"
            >
              Gerar alertas agora →
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </div>
  )
}
