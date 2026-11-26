import { UpdateStatusCard } from '../../planning/UpdateStatusCard'
import { LoadingState } from '../../../shared/components/LoadingState'
import { useState } from 'react'
import { ArrowRight, BarChart2, Coins, TrendingUp, Wallet, type LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { KpiCard } from '../../../shared/components/KpiCard'
import { PanelCard } from '../../../shared/components/PanelCard'
import { useAuth } from '../../auth/hooks/useAuth'
import { WealthEvolution } from './WealthEvolution'
import { AlertasRecentes } from './AlertasRecentes'
import { useDashboard } from '../../dashboard/hooks/useDashboard'
import { useWallets } from '../../portfolio/hooks/useWallets'
import { MobileCarteiraHome } from '../../portfolio/components/MobileCarteiraHome'
import { DeferredQuickTransactionModal as QuickTransactionModal } from '../../portfolio/components/DeferredQuickTransactionModal'
import { useIsMobile } from '../../../shared/hooks/useIsMobile'
import { ReturnHistoryNotice } from '../../performance/components/ReturnHistoryNotice'
import { ReturnPeriodNotice } from '../../performance/components/ReturnPeriodNotice'
import { useNewAlertsCount } from '../../alerts/hooks/useAlerts'
import { walletPalette } from '../../portfolio/walletPalette'
import { InformationHelp } from '../../../shared/components/InformationHelp'
import { Modal } from '../../../shared/components/Modal'
import type { DashboardData } from '../../dashboard/hooks/useDashboard'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const percent = new Intl.NumberFormat('pt-BR', {
  style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'exceptZero',
})

function money(value: number | null) {
  return value === null ? '—' : currency.format(value)
}

function percentage(value: number | null) {
  return value === null ? '—' : percent.format(value / 100)
}

export function InicioPage() {
  const isMobile = useIsMobile()
  const { data: alertCount = 0 } = useNewAlertsCount()
  const [isQuickTransactionOpen, setIsQuickTransactionOpen] = useState(false)
  const { user } = useAuth()
  const { selectedWallet } = useWallets()
  const dashboard = useDashboard(selectedWallet?.id ?? '')
  const fullName = user?.user_metadata?.full_name
  const firstName =
    typeof fullName === 'string' && fullName.trim()
      ? fullName.split(' ')[0]
      : user?.email?.split('@')[0] ?? 'investidor'

  const hoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const content = (
    <div className="flex min-w-0 w-full flex-col gap-5 px-4 md:px-0 md:pt-2">
      {/* ── Saudação ── */}
      <div className="pb-14 pt-5 md:py-8">
        <div className="min-w-0">
          {/* Saudação: text-[26px] font-medium intencional — hierarquia visual de boas-vindas,
              maior e mais leve que os títulos de seção (text-[22px] font-semibold) das demais páginas */}
          <h1 className="text-[26px] font-medium leading-none text-white md:text-[32px]">
            Olá, {firstName}
          </h1>
          <p className="mt-3 text-[14px] font-medium text-[#B8B8B8]">
            {hoje}
          </p>
          {selectedWallet && (
            <p className="mt-1.5 flex items-center gap-1.5 font-nunito text-[12px] font-semibold text-[#8F8F8F]">
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: walletPalette[selectedWallet.color].color }}
              />
              {selectedWallet.name}
            </p>
          )}
        </div>
      </div>

      {/* O resumo mobile prioriza os totais; os detalhes ficam disponíveis por toque. */}
      {isMobile ? <MobileDashboardSummary key={selectedWallet?.id} dashboard={dashboard} /> : <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <KpiCard
          label="Patrimônio total"
          helpTopic="balance"
          value={money(dashboard.totalPatrimonioBRL)}
          icon={Wallet}
          sub={[{ label: 'Valor investido', value: money(dashboard.valorInvestidoBRL) }]}
        />
        <KpiCard
          label="Lucro atual"
          value={money(dashboard.lucroTotalBRL)}
          valueColor={dashboard.lucroTotalBRL !== null && dashboard.lucroTotalBRL < 0 ? 'text-red-400' : 'text-nf-green'}
          icon={Coins}
          sub={[
            { label: 'Ganho de capital', value: money(dashboard.ganhoCapitalBRL) },
            { label: 'Dividendos recebidos', value: money(dashboard.proventosTotalBRL), valueColor: 'text-nf-green' },
          ]}
        />
        <KpiCard
          label="Proventos recebidos (12M)"
          helpTopic="income"
          value={money(dashboard.proventos12mBRL)}
          icon={Coins}
          sub={[{ label: 'Total', value: money(dashboard.proventosTotalBRL) }]}
        />
        <KpiCard
          label="Rentabilidade histórica"
          helpTopic="returns"
          value={percentage(dashboard.rentabilidadeTotalPct)}
          valueColor={dashboard.rentabilidadeTotalPct !== null && dashboard.rentabilidadeTotalPct < 0 ? 'text-red-400' : 'text-nf-green'}
          icon={BarChart2}
          arrowUp={dashboard.rentabilidadeTotalPct !== null && dashboard.rentabilidadeTotalPct > 0}
          sub={[
            { label: 'Últimos 12M', value: percentage(dashboard.variacaoPct), valueColor: 'text-[#B8B8B8]' },
            { label: 'Total', value: percentage(dashboard.rentabilidadeTotalPct), valueColor: dashboard.rentabilidadeTotalPct !== null && dashboard.rentabilidadeTotalPct < 0 ? 'text-red-400' : 'text-nf-green' },
          ]}
        />
      </div>}

      <div className="flex justify-end md:hidden"><UpdateStatusCard /></div>
      {!isMobile && <ReturnPeriodNotice endDate={dashboard.returnEndDate} />}
      <ReturnHistoryNotice incomplete={dashboard.historyIncomplete} issues={dashboard.historyIssues} onRetry={dashboard.refetch} />
      {dashboard.isLoading && <LoadingState label="Carregando dados da carteira…" />}
      {dashboard.isError && (
        <button type="button" onClick={dashboard.refetch} className="self-start text-sm text-red-300">
          Não foi possível atualizar os dados. Tentar novamente
        </button>
      )}

      {/* ── Gráfico + Alertas ── */}
      <div className="grid min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(280px,1fr)]">
        {/* Evolução do patrimônio */}
        <PanelCard className="min-w-0 max-md:rounded-none max-md:border-0 max-md:bg-transparent" padding="p-0 md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[18px] font-medium text-white/90 md:text-[20px]">
              Evolução do patrimônio
            </h2>
            <div className="flex items-center gap-3 md:gap-4">
              <NavLink
                to="/desempenho"
                className="flex items-center gap-1 text-[12px] font-medium text-nf-blue hover:underline"
              >
                Ver desempenho
                <ArrowRight className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
              </NavLink>
            </div>
          </div>
          <WealthEvolution />
        </PanelCard>

        {/* Alertas recentes */}
        <AlertasRecentes />
      </div>

      {/* ── Atalhos ── */}
      <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-3 xl:gap-4">
        <ShortcutCard
          to="/ativos"
          label="Ativos"
          sub="Ver ativos da carteira"
          icon={Wallet}
          color="#F765A3"
        />
        <ShortcutCard
          to="/desempenho"
          label="Desempenho"
          sub={`Rentabilidade ${percentage(dashboard.rentabilidadeTotalPct)} · Proventos 12M ${money(dashboard.proventos12mBRL)}`}
          icon={TrendingUp}
          color="#6FE0A0"
        />
        <ShortcutCard
          to="/analise"
          label="Análise"
          sub="Ver análises e alertas"
          icon={BarChart2}
          color="#FFD95A"
        />
      </div>
    </div>
  )

  if (!isMobile) return content

  return (
    <>
      <MobileCarteiraHome
        dashboard={dashboard}
        alertCount={alertCount}
        onAddTransaction={() => setIsQuickTransactionOpen(true)}
      >
        {content}
      </MobileCarteiraHome>
      <QuickTransactionModal
        isOpen={isQuickTransactionOpen}
        onClose={() => setIsQuickTransactionOpen(false)}
      />
    </>
  )
}

function MobileDashboardSummary({ dashboard }: { dashboard: DashboardData }) {
  const [detail, setDetail] = useState<'profit' | 'returns' | null>(null)
  const profitColor = dashboard.lucroTotalBRL === null ? 'text-white' : dashboard.lucroTotalBRL < 0 ? 'text-red-400' : 'text-nf-green'
  const returnColor = dashboard.rentabilidadeTotalPct === null ? 'text-white' : dashboard.rentabilidadeTotalPct < 0 ? 'text-red-400' : 'text-nf-green'

  return (
    <section aria-label="Resumo da carteira" className="space-y-3">
      <div className="rounded-2xl bg-[#1C1C1C] p-4">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <h2 className="flex min-w-0 items-center gap-2 text-sm text-[#B8B8B8]">
            <Wallet className="h-4 w-4 shrink-0" strokeWidth={1.6} aria-hidden="true" />
            Patrimônio total
          </h2>
          <InformationHelp topic="balance" />
        </div>
        <p className="mt-1 break-words text-[clamp(1.5rem,7.5vw,2rem)] font-medium leading-tight tracking-tight text-white tabular-nums">
          {money(dashboard.totalPatrimonioBRL)}
        </p>
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs">
          <span className="text-[#A3A3A3]">Valor investido</span>
          <span className="break-words text-sm text-white/90 tabular-nums">{money(dashboard.valorInvestidoBRL)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 items-start gap-4 rounded-2xl bg-[#191919] p-4">
        <div className="min-w-0">
          <h2 className="flex min-h-9 items-center text-xs text-[#B8B8B8]">Lucro atual</h2>
          <p className={`mt-1 [overflow-wrap:anywhere] text-[clamp(0.95rem,4.3vw,1.25rem)] font-medium leading-tight tabular-nums ${profitColor}`}>
            {money(dashboard.lucroTotalBRL)}
          </p>
          <p className="mt-1.5 text-[11px] text-[#A3A3A3]">Desde o início</p>
          <button type="button" aria-haspopup="dialog" aria-expanded={detail === 'profit'} onClick={() => setDetail('profit')} className="mt-3 flex min-h-11 items-center gap-1.5 rounded-lg bg-white/[0.04] px-2 text-xs text-[#B8B8B8] transition-colors hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/40">
            Ver composição <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          </button>
        </div>
        <div className="min-w-0">
          <div className="flex min-w-0 items-start justify-between gap-0.5">
            <h2 className="flex min-h-9 min-w-0 items-center break-words text-xs text-[#B8B8B8]">Rentabilidade</h2>
            <InformationHelp topic="returns" />
          </div>
          <p className={`mt-1 [overflow-wrap:anywhere] text-[clamp(0.95rem,4.3vw,1.25rem)] font-medium leading-tight tabular-nums ${returnColor}`}>
            {percentage(dashboard.rentabilidadeTotalPct)}
          </p>
          <p className="mt-1.5 text-[11px] text-[#A3A3A3]">Desde o início</p>
          <button type="button" aria-haspopup="dialog" aria-expanded={detail === 'returns'} onClick={() => setDetail('returns')} className="mt-3 flex min-h-11 items-center gap-1.5 rounded-lg bg-white/[0.04] px-2 text-xs text-[#B8B8B8] transition-colors hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/40">
            Ver período <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex min-w-0 items-center justify-between gap-2 rounded-2xl bg-[#191919] px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-xs text-[#B8B8B8]">Proventos</h2>
          <p className="mt-1 text-[11px] text-[#A3A3A3]">Últimos 12 meses</p>
        </div>
        <div className="flex min-w-0 items-center gap-1">
          <p className="min-w-0 [overflow-wrap:anywhere] text-sm font-medium text-white tabular-nums">{money(dashboard.proventos12mBRL)}</p>
          <InformationHelp topic="income" />
        </div>
      </div>
      <Modal isOpen={detail !== null} onClose={() => setDetail(null)} title={detail === 'profit' ? 'Composição do lucro' : 'Períodos de rentabilidade'} variant="information">
        {detail === 'profit' ? <dl className="space-y-5 text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"><dt className="text-[#B8B8B8]">Ganho de capital</dt><dd className="text-base text-white tabular-nums">{money(dashboard.ganhoCapitalBRL)}</dd></div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"><dt className="text-[#B8B8B8]">Dividendos recebidos</dt><dd className="text-base text-white tabular-nums">{money(dashboard.proventosTotalBRL)}</dd></div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pt-2"><dt className="text-[#B8B8B8]">Lucro atual</dt><dd className={`text-base font-medium tabular-nums ${profitColor}`}>{money(dashboard.lucroTotalBRL)}</dd></div>
        </dl> : <div className="space-y-6">
          <dl className="space-y-5 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"><dt className="text-[#B8B8B8]">Desde o início</dt><dd className={`text-base tabular-nums ${returnColor}`}>{percentage(dashboard.rentabilidadeTotalPct)}</dd></div>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"><dt className="text-[#B8B8B8]">Últimos 12 meses</dt><dd className="text-base text-white tabular-nums">{percentage(dashboard.variacaoPct)}</dd></div>
          </dl>
          <ReturnPeriodNotice endDate={dashboard.returnEndDate} />
        </div>}
      </Modal>
    </section>
  )
}

// ── Componente de atalho inline ────────────────────────────────────────────
type ShortcutProps = {
  to: string
  label: string
  sub: string
  icon: LucideIcon
  color: string
}

function ShortcutCard({ to, label, sub, icon: Icon, color }: ShortcutProps) {
  return (
    <NavLink
      to={to}
      className="
        group flex min-w-0 flex-1 items-center gap-3.5 rounded-xl
        bg-white/[0.08] px-[18px] py-4
        transition-colors hover:border-white/20 hover:bg-white/[0.1]
      "
    >
      {/* Ícone */}
      <span
        className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[10px]"
        style={{ background: `${color}29` }}
        aria-hidden="true"
      >
        <Icon
          className="h-5 w-5"
          strokeWidth={1.8}
          aria-hidden="true"
          style={{ color }}
        />
      </span>

      {/* Texto */}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-white">{label}</span>
        <span className="block break-words text-[12px] text-[#8F8F8F]">{sub}</span>
      </span>

      <ArrowRight
        className="h-4 w-4 shrink-0 text-[#8F8F8F] transition-colors group-hover:text-white"
        strokeWidth={2}
        aria-hidden="true"
      />
    </NavLink>
  )
}
