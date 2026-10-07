/**
 * AnaliseAlertas — sub-rota /analise/alertas.
 * Lista de cards de alertas + form inline de alerta de preço.
 */
import { useState } from 'react'
import {
  Bell, BellRing, Check, TrendingDown, TrendingUp, AlertTriangle, Clock, X,
  type LucideIcon,
} from 'lucide-react'
import { useAlerts } from '../../alerts/hooks/useAlerts'
import {
  useUpdateAlertStatus,
  useGenerateAlerts,
  useCreatePriceTargetAlert,
} from '../../alerts/hooks/useAlertMutations'
import type { Alert, AlertType, AlertCondition } from '../../alerts/types'

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
function PriceAlertForm({ onClose }: { onClose: () => void }) {
  const [ticker, setTicker] = useState('')
  const [condition, setCondition] = useState<AlertCondition>('below')
  const [targetPrice, setTargetPrice] = useState('')
  const [error, setError] = useState('')

  const createAlert = useCreatePriceTargetAlert()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const price = parseFloat(targetPrice.replace(',', '.'))
    if (!ticker.trim()) {
      setError('Informe o ticker do ativo.')
      return
    }
    if (isNaN(price) || price <= 0) {
      setError('Informe um preço-alvo válido.')
      return
    }

    try {
      await createAlert.mutateAsync({
        ticker: ticker.trim().toUpperCase(),
        targetPrice: price,
        condition,
      })
      onClose()
    } catch {
      setError('Erro ao criar alerta. Tente novamente.')
    }
  }

  return (
    <div className="rounded-[14px] border border-nf-blue/20 bg-[#1B1B1B] p-5">
      <h3 className="mb-4 text-[14px] font-semibold text-white">Novo alerta de preço</h3>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3" noValidate>
        {/* Ativo */}
        <div className="flex flex-col gap-1 min-w-[140px]">
          <label htmlFor="alert-ticker" className="text-[11px] text-white/50">
            Ativo (ticker)
          </label>
          <input
            id="alert-ticker"
            type="text"
            placeholder="Ex: PETR4"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            className="rounded-lg border border-white/[0.1] bg-[#2A2A2A] px-3 py-2 text-[13px] text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-nf-blue/40"
            maxLength={10}
          />
        </div>

        {/* Condição */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-white/50">Condição</span>
          <div className="flex gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="condition"
                value="below"
                checked={condition === 'below'}
                onChange={() => setCondition('below')}
                className="accent-nf-blue"
              />
              <span className="text-[12px] text-white/80">Abaixo de</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="condition"
                value="above"
                checked={condition === 'above'}
                onChange={() => setCondition('above')}
                className="accent-nf-blue"
              />
              <span className="text-[12px] text-white/80">Acima de</span>
            </label>
          </div>
        </div>

        {/* Preço-alvo */}
        <div className="flex flex-col gap-1 min-w-[140px]">
          <label htmlFor="alert-price" className="text-[11px] text-white/50">
            Preço-alvo (R$)
          </label>
          <input
            id="alert-price"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Ex: 28.50"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            className="rounded-lg border border-white/[0.1] bg-[#2A2A2A] px-3 py-2 text-[13px] text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-nf-blue/40"
          />
        </div>

        {/* Botões */}
        <div className="flex items-end gap-2 pb-0">
          <button
            type="submit"
            disabled={createAlert.isPending}
            className="rounded-full bg-blue-600 px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {createAlert.isPending ? 'Criando…' : 'Criar alerta'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={createAlert.isPending}
            className="rounded-full border border-white/[0.15] px-4 py-2 text-[12px] font-medium text-white/70 transition-colors hover:border-white/30 hover:text-white disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </form>
      {error && (
        <p className="mt-2 text-[12px] text-nf-pink" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────
export function AnaliseAlertas() {
  const [showAlertForm, setShowAlertForm] = useState(false)

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

  return (
    <div className="flex flex-col gap-5">
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
          <button
            type="button"
            disabled={generate.isPending}
            onClick={() => generate.mutate()}
            className="flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-[#393939] px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-white/[0.12] disabled:opacity-50"
          >
            <Bell
              className={`h-3.5 w-3.5 ${generate.isPending ? 'animate-pulse' : ''}`}
              strokeWidth={1.8}
              aria-hidden="true"
            />
            Atualizar alertas
          </button>
        </div>
      </div>

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
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <Bell className="h-8 w-8 text-white/20" strokeWidth={1.5} aria-hidden="true" />
          <p className="text-[13px] text-white/40">Nenhum alerta gerado.</p>
          <button
            type="button"
            disabled={generate.isPending}
            onClick={() => generate.mutate()}
            className="text-[12px] font-medium text-nf-blue hover:underline disabled:opacity-50"
          >
            Gerar alertas agora →
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </div>
  )
}
