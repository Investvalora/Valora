/**
 * KpiBarAtivos — barra horizontal com 4 KPIs e link "Resumo completo".
 * Usada na sub-tab Posições de AtivosPage.
 */
type KpiBarAtivosProps = {
  patrimonio: string
  valorInvestido: string
  ganhoCapital: string
  ganhoCapitalPositive: boolean | null
  ativos: number
  onResumo: () => void
}

export function KpiBarAtivos({
  patrimonio,
  valorInvestido,
  ganhoCapital,
  ganhoCapitalPositive,
  ativos,
  onResumo,
}: KpiBarAtivosProps) {
  const ganhoColor =
    ganhoCapitalPositive === null
      ? 'text-white'
      : ganhoCapitalPositive
        ? 'text-nf-green'
        : 'text-nf-pink'

  return (
    <div
      className="
        rounded-xl border border-white/[0.08] bg-[#1A1A1A]
        px-6 py-4 flex items-center gap-0
      "
    >
      {/* KPI 1 — Patrimônio total */}
      <div className="flex flex-1 flex-col gap-0.5 pr-6">
        <span className="text-[11px] text-white/50">Patrimônio total</span>
        <span className="text-[18px] font-semibold text-white leading-tight">{patrimonio}</span>
      </div>

      <div className="self-stretch border-r border-white/[0.08]" aria-hidden="true" />

      {/* KPI 2 — Valor investido */}
      <div className="flex flex-1 flex-col gap-0.5 px-6">
        <span className="text-[11px] text-white/50">Valor investido</span>
        <span className="text-[18px] font-semibold text-white leading-tight">{valorInvestido}</span>
      </div>

      <div className="self-stretch border-r border-white/[0.08]" aria-hidden="true" />

      {/* KPI 3 — Ganho de capital */}
      <div className="flex flex-1 flex-col gap-0.5 px-6">
        <span className="text-[11px] text-white/50">Ganho de capital</span>
        <span className={`text-[18px] font-semibold leading-tight ${ganhoColor}`}>
          {ganhoCapital}
        </span>
      </div>

      <div className="self-stretch border-r border-white/[0.08]" aria-hidden="true" />

      {/* KPI 4 — Ativos */}
      <div className="flex flex-1 flex-col gap-0.5 pl-6">
        <span className="text-[11px] text-white/50">Ativos</span>
        <span className="text-[18px] font-semibold text-white leading-tight">{ativos}</span>
      </div>

      {/* Link Resumo completo */}
      <button
        type="button"
        onClick={onResumo}
        className="ml-auto shrink-0 text-sm text-nf-blue hover:underline"
      >
        Resumo completo &gt;
      </button>
    </div>
  )
}
