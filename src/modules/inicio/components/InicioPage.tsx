import { ArrowRight, BarChart2, Coins, TrendingUp, Wallet } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { KpiCard } from '../../../shared/components/KpiCard'
import { PanelCard } from '../../../shared/components/PanelCard'
import { useAuth } from '../../auth/hooks/useAuth'
import { EvolucaoChart } from './EvolucaoChart'
import { AlertasRecentes } from './AlertasRecentes'

export function InicioPage() {
  const { user } = useAuth()
  const fullName = user?.user_metadata?.full_name
  const firstName =
    typeof fullName === 'string' && fullName.trim()
      ? fullName.split(' ')[0]
      : 'Samuel'

  const hoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="flex flex-col gap-5 pt-2">
      {/* ── Saudação ── */}
      <div className="relative flex items-end overflow-hidden rounded-[22px] bg-[#131313] py-8 pl-2">
        <div>
          <h1 className="text-[32px] font-medium leading-none text-white">
            Olá, {firstName}
          </h1>
          <p className="mt-3 text-[13px] text-[#8F8F8F]">
            {hoje} · Carteira 1
          </p>
        </div>
      </div>

      {/* ── 4 KPIs ── */}
      <div className="flex gap-4">
        <KpiCard
          label="Patrimônio total"
          value="R$ 13.666,39"
          icon={Wallet}
          sub={[{ label: 'Valor investido', value: 'R$ 12.949,02' }]}
        />
        <KpiCard
          label="Lucro total"
          value="R$ 1.568,77"
          valueColor="text-nf-green"
          icon={Coins}
          sub={[
            { label: 'Ganho de capital', value: 'R$ 717,37' },
            { label: 'Dividendos recebidos', value: 'R$ 851,40', valueColor: 'text-nf-green' },
          ]}
        />
        <KpiCard
          label="Proventos recebidos (12M)"
          value="R$ 851,40"
          icon={Coins}
          sub={[{ label: 'Total', value: 'R$ 851,40' }]}
        />
        <KpiCard
          label="Rentabilidade"
          value="+5,54%"
          valueColor="text-nf-green"
          icon={BarChart2}
          arrowUp
          sub={[
            { label: 'Últimos 12M', value: '—', valueColor: 'text-[#B8B8B8]' },
            { label: 'Total', value: '+5,54%', valueColor: 'text-nf-green' },
          ]}
        />
      </div>

      {/* ── Gráfico + Alertas ── */}
      <div className="flex gap-5">
        {/* Evolução do patrimônio */}
        <PanelCard className="flex-1" padding="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-white/80">
              Evolução do patrimônio
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-[#33AA3B]/85" aria-hidden="true" />
                <span className="text-[11px] text-[#8F8F8F]">Aplicado</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-[#A9E0AC]/80" aria-hidden="true" />
                <span className="text-[11px] text-[#8F8F8F]">Ganho</span>
              </div>
              <NavLink
                to="/desempenho"
                className="flex items-center gap-1 text-[12px] font-medium text-nf-blue hover:underline"
              >
                Ver desempenho
                <ArrowRight className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
              </NavLink>
            </div>
          </div>
          <EvolucaoChart />
        </PanelCard>

        {/* Alertas recentes */}
        <AlertasRecentes />
      </div>

      {/* ── Atalhos ── */}
      <div className="flex gap-4">
        <ShortcutCard
          to="/ativos"
          label="Ativos"
          sub="28 ativos em 5 classes"
          icon={Wallet}
          color="#F765A3"
        />
        <ShortcutCard
          to="/desempenho"
          label="Desempenho"
          sub="Rentabilidade +5,54% · Proventos 12M R$ 851,40"
          icon={TrendingUp}
          color="#6FE0A0"
        />
        <ShortcutCard
          to="/analise"
          label="Análise"
          sub="2 alertas novos · 2 scores criados"
          icon={BarChart2}
          color="#FFD95A"
        />
      </div>
    </div>
  )
}

// ── Componente de atalho inline ────────────────────────────────────────────
type ShortcutProps = {
  to: string
  label: string
  sub: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; 'aria-hidden'?: string }>
  color: string
}

function ShortcutCard({ to, label, sub, icon: Icon, color }: ShortcutProps) {
  return (
    <NavLink
      to={to}
      className="
        group flex flex-1 items-center gap-3.5 rounded-xl
        border border-[#909090]/45 px-[18px] py-4
        transition-colors hover:border-white/20 hover:bg-white/[0.03]
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
        <span className="block truncate text-[12px] text-[#8F8F8F]">{sub}</span>
      </span>

      <ArrowRight
        className="h-4 w-4 shrink-0 text-[#8F8F8F] transition-colors group-hover:text-white"
        strokeWidth={2}
        aria-hidden="true"
      />
    </NavLink>
  )
}
