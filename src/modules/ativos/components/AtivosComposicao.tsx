import { AssetValuationNotice } from './AssetValuationNotice'
import { useAtivosValuation } from '../hooks/useAtivosValuation'
/**
 * AtivosComposicao — sub-rota /ativos/composicao
 *
 * Exibe KpiBarAtivos + donut chart à esquerda com label central
 * e lista de classes à direita.
 */
import { useMemo, useRef, useState } from 'react'
import { useWallets } from '../../portfolio/hooks/useWallets'
import { deriveComposition, assetClassColor, isInternationalClass } from '../../portfolio/composition'
import { KpiBarAtivos } from './KpiBarAtivos'
import { ResumoCarteiraPopover } from './ResumoCarteiraPopover'
import { PanelCard } from '../../../shared/components/PanelCard'
import { fmtMoney, fmtPct } from '../utils/fmt'
import type { AssetClassSlice } from '../../portfolio/types'
import { useDividendTotals } from '../../portfolio/hooks/useDividendTotals'
import { buildAssetSlices, type CompositionSlice } from '../utils/compositionSlices'
import { useAssetFilters } from '../hooks/useAssetFilters'

// ── Donut SVG com label central ────────────────────────────────────────────
const CX = 100
const CY = 100
const R_OUTER = 90
const R_INNER = 62
const GAP_DEG = 2.5

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function sectorPath(startDeg: number, endDeg: number): string {
  const s1 = polar(CX, CY, R_OUTER, startDeg)
  const e1 = polar(CX, CY, R_OUTER, endDeg)
  const s2 = polar(CX, CY, R_INNER, endDeg)
  const e2 = polar(CX, CY, R_INNER, startDeg)
  const large = endDeg - startDeg > 180 ? 1 : 0
  const f = (n: number) => n.toFixed(3)
  return [
    `M${f(s1.x)},${f(s1.y)}`,
    `A${R_OUTER},${R_OUTER} 0 ${large},1 ${f(e1.x)},${f(e1.y)}`,
    `L${f(s2.x)},${f(s2.y)}`,
    `A${R_INNER},${R_INNER} 0 ${large},0 ${f(e2.x)},${f(e2.y)}`,
    'Z',
  ].join(' ')
}

const LABEL_RADIUS = R_OUTER + 18 // raio do ponto médio do label externo

function CompositionDonut({
  slices,
  totalBRL,
  size = 200,
}: {
  slices: CompositionSlice[]
  totalBRL: number
  size?: number
}) {
  if (slices.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <p className="text-[12px] text-[#8F8F8F]">Sem dados</p>
      </div>
    )
  }

  const total = slices.reduce((acc, s) => acc + s.percent, 0)
  let angle = 0
  const sectors = slices.map((s) => {
    const pct = (s.percent / total) * 100
    const sweep = (pct / 100) * 360
    const gap = Math.min(GAP_DEG, sweep / 4)
    const startDeg = angle + gap / 2
    const endDeg = angle + sweep - gap / 2
    const midDeg = angle + sweep / 2
    angle += sweep
    return {
      slice: s,
      startDeg,
      endDeg: Math.max(startDeg + 0.1, endDeg),
      midDeg,
      pct,
    }
  })

  const patrimonioFormatted = fmtMoney(totalBRL > 0 ? totalBRL : null)

  // viewBox expandido para acomodar labels externos
  const viewBoxSize = size === 180 ? 240 : 260
  const vbOffset = (viewBoxSize - 200) / 2

  return (
    <svg
      width={size}
      height={size}
      className="max-w-full h-auto"
      viewBox={`${-vbOffset} ${-vbOffset} ${viewBoxSize} ${viewBoxSize}`}
      aria-label="Gráfico de composição da carteira"
      role="img"
    >
      {/* Fundo */}
      <circle
        cx={CX}
        cy={CY}
        r={(R_OUTER + R_INNER) / 2}
        fill="none"
        stroke="#252525"
        strokeWidth={R_OUTER - R_INNER}
      />
      {/* Fatias */}
      {sectors.map(({ slice, startDeg, endDeg }) => (
        <path
          key={slice.id}
          d={sectorPath(startDeg, endDeg)}
          fill={slice.color}
          fillOpacity={0.88}
          aria-label={`${slice.label}: ${fmtPct(slice.percent)}`}
        >
          <title>{`${slice.label}: ${fmtMoney(slice.valueBRL)} (${fmtPct(slice.percent).replace('+', '')})`}</title>
        </path>
      ))}
      {/* Labels externos de % — apenas fatias > 4% */}
      {sectors
        .filter(({ pct }) => pct > 4)
        .map(({ slice, midDeg, pct }) => {
          const pt = polar(CX, CY, LABEL_RADIUS, midDeg)
          return (
            <text
              key={`lbl-${slice.id}`}
              x={pt.x.toFixed(2)}
              y={pt.y.toFixed(2)}
              textAnchor="middle"
              dominantBaseline="central"
              fill={slice.color}
              fontSize="9"
              fontWeight="600"
              fontFamily="inherit"
              aria-hidden="true"
            >
              {Math.round(pct)}%
            </text>
          )
        })}
      {/* Label central */}
      <text
        x={CX}
        y={CY - 8}
        textAnchor="middle"
        fill="#9B9B9B"
        fontSize="11"
        fontFamily="inherit"
      >
        Patrimônio
      </text>
      <text
        x={CX}
        y={CY + 10}
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="13"
        fontWeight="600"
        fontFamily="inherit"
      >
        {patrimonioFormatted}
      </text>
    </svg>
  )
}

// ── Lista de classes ───────────────────────────────────────────────────────
function ClassList({ slices }: { slices: CompositionSlice[] }) {
  return (
    <div className="flex flex-col gap-3">
      {slices.map((s) => {
        const color = s.color
        const isIntl = s.international
        const barWidth = Math.min(100, Math.max(0, s.percent))

        return (
          <div key={s.id} className="flex flex-col gap-1.5">
            <div className="space-y-1.5 md:hidden">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-[13px] text-white/80">{s.label}</span>
                <span className="shrink-0 text-[12px] text-white/60 tabular-nums">{fmtPct(s.percent).replace('+', '')}</span>
              </div>
              <div className="flex min-w-0 items-center justify-between gap-2 pl-[18px]">
                <span className="min-w-0 truncate text-[11px] text-white/40">
                  {s.topTicker}{isIntl ? ' · Internacional' : ''}
                </span>
                <span className="shrink-0 text-[12px] font-medium text-white tabular-nums">{fmtMoney(s.valueBRL)}</span>
              </div>
            </div>
            {/* Linha principal */}
            <div className="hidden items-center gap-2 md:flex">
              {/* Dot colorido */}
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: color }}
                aria-hidden="true"
              />
              {/* Nome da classe */}
              <span className="text-[13px] text-white/80">{s.label}</span>
              {/* Badge Internacional */}
              {isIntl && (
                <span className="rounded-md border border-white/[0.12] px-1.5 py-0.5 text-[10px] text-white/40">
                  Internacional
                </span>
              )}
              {/* Maior posição */}
              <span className="text-[11px] text-white/40">{s.topTicker}</span>
              {/* Valor e percentual */}
              <span className="ml-auto text-[13px] font-medium text-white tabular-nums">
                {fmtMoney(s.valueBRL)}
              </span>
              <span className="w-[42px] text-right text-[12px] text-white/50 tabular-nums">
                {fmtPct(s.percent).replace('+', '')}
              </span>
            </div>
            {/* Barra de progresso */}
            <div className="h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${barWidth}%`, background: color }}
                aria-hidden="true"
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────

const TOGGLE_OPTIONS = ['Tipo de ativos', 'Ativos', 'Exposição ao exterior'] as const
type ToggleOption = typeof TOGGLE_OPTIONS[number]

export function AtivosComposicao() {
  const { selectedWallet } = useWallets()
  const walletId = selectedWallet?.id ?? ''

  // ── Dados ─────────────────────────────────────────────────────────────────
  const { positions, tickers, compositionRows, totalBRL, patrimonioBRL, valorInvestidoBRL, assetCount, isLoading, isError, complete } = useAtivosValuation(walletId)
  const { query, types } = useAssetFilters()

  const quantityByTicker = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of positions) m.set(p.ticker, Number(p.quantity))
    return m
  }, [positions])

  const dividendTotalsByTicker = useDividendTotals(tickers, quantityByTicker)
  const composition = useMemo(() => deriveComposition(compositionRows, totalBRL), [compositionRows, totalBRL])

  // ── Derivação ─────────────────────────────────────────────────────────────
  const ganhoCapitalBRL = useMemo(() => {
    if (patrimonioBRL === null || valorInvestidoBRL === null) return null
    return patrimonioBRL - valorInvestidoBRL
  }, [patrimonioBRL, valorInvestidoBRL])

  const proventos12mBRL = useMemo(() => {
    let total = 0
    for (const v of dividendTotalsByTicker.values()) total += v
    return total > 0 ? total : null
  }, [dividendTotalsByTicker])

  const rentabilidadePct = useMemo(() => {
    if (valorInvestidoBRL === null || valorInvestidoBRL <= 0 || patrimonioBRL === null) return null
    return ((patrimonioBRL - valorInvestidoBRL) / valorInvestidoBRL) * 100
  }, [patrimonioBRL, valorInvestidoBRL])

  // ── Resumo popover ─────────────────────────────────────────────────────────
  const [isResumoOpen, setIsResumoOpen] = useState(false)
  const resumoBtnRef = useRef<HTMLButtonElement | null>(null)

  // ── UI state ───────────────────────────────────────────────────────────────
  const [activeToggle, setActiveToggle] = useState<ToggleOption>('Tipo de ativos')
  const [showIdeal, setShowIdeal] = useState(false)


  // Filtrar slices pelo toggle ativo
  const visibleSlices = useMemo(() => {
    if (activeToggle === 'Ativos') return buildAssetSlices(compositionRows, totalBRL)
    const slices = activeToggle === 'Exposição ao exterior'
      ? composition.slices.filter((s) => isInternationalClass(s.type))
      : composition.slices
    return slices.map((slice: AssetClassSlice): CompositionSlice => ({
      ...slice, id: slice.type, color: assetClassColor(slice.type), international: isInternationalClass(slice.type),
    }))
  }, [composition.slices, activeToggle, compositionRows, totalBRL])

  return (
    <div className="flex flex-col gap-5">
      <AssetValuationNotice loading={Boolean(isLoading)} error={Boolean(isError)} complete={complete} />
      {/* ── KPI bar ── */}
      <div className="relative overflow-x-auto md:overflow-visible">
        <KpiBarAtivos
          patrimonio={fmtMoney(patrimonioBRL)}
          valorInvestido={fmtMoney(valorInvestidoBRL)}
          ganhoCapital={fmtMoney(ganhoCapitalBRL)}
          ganhoCapitalPositive={
            ganhoCapitalBRL === null ? null : ganhoCapitalBRL >= 0
          }
          ativos={assetCount}
          onResumo={() => setIsResumoOpen((o) => !o)}
          resumoBtnRef={resumoBtnRef}
        />

        {isResumoOpen && (
          <ResumoCarteiraPopover
            anchorRef={resumoBtnRef}
            patrimonio={fmtMoney(patrimonioBRL)}
            valorInvestido={fmtMoney(valorInvestidoBRL)}
            ganhoCapital={fmtMoney(ganhoCapitalBRL)}
            proventos12m={fmtMoney(proventos12mBRL)}
            dividendos={fmtMoney(proventos12mBRL)}
            rentabilidade={fmtPct(rentabilidadePct)}
            onClose={() => setIsResumoOpen(false)}
          />
        )}
      </div>

      {/* ── Card de composição ── */}
      <PanelCard padding="p-4 md:p-6">
        {/* Cabeçalho */}
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center md:justify-between">
          <h2 className="text-[14px] font-semibold text-white">
            {activeToggle === 'Ativos' ? 'Composição por ativo' : activeToggle === 'Exposição ao exterior' ? 'Exposição ao exterior' : 'Composição por classe'}
          </h2>

          {/* Toggle segmentado */}
          <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <div className="md:hidden">
              <label htmlFor="composition-view" className="mb-1.5 block text-xs text-white/50">Visualizar por</label>
              <select
                id="composition-view"
                value={activeToggle}
                onChange={(event) => setActiveToggle(event.target.value as ToggleOption)}
                className="min-h-11 w-full rounded-xl border border-white/[0.12] bg-[#262626] px-3 text-sm text-white focus:border-nf-blue focus:outline-none"
              >
                {TOGGLE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="hidden rounded-full border border-white/[0.12] bg-white/[0.04] p-0.5 md:flex">
              {TOGGLE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  aria-pressed={activeToggle === opt}
                  onClick={() => setActiveToggle(opt)}
                  className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                    activeToggle === opt
                      ? 'bg-white/[0.12] text-white'
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            {/* Switch posição ideal */}
            <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 md:min-h-0 md:justify-start md:rounded-none md:border-0 md:bg-transparent md:px-0">
              <span id="ideal-position-label" className="min-w-0 text-[12px] text-white/60 md:text-white/50">Exibir posição ideal</span>
              <button
                type="button"
                role="switch"
                aria-checked={showIdeal}
                aria-labelledby="ideal-position-label"
                onClick={() => setShowIdeal((v) => !v)}
                className={`relative h-5 w-9 shrink-0 overflow-hidden rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-blue ${
                  showIdeal ? 'bg-nf-blue' : 'bg-white/[0.12]'
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ease-out motion-reduce:transition-none ${
                    showIdeal ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-[200px] items-center justify-center">
            <p className="text-[13px] text-[#8F8F8F] animate-pulse">Carregando composição…</p>
          </div>
        ) : composition.slices.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center">
            <p className="text-[13px] text-[#8F8F8F]">{query || types.length ? 'Nenhum ativo corresponde aos filtros selecionados.' : 'Nenhuma posição avaliada.'}</p>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-8 md:flex-row">
            {/* Donut — 180px mobile, 200px desktop */}
            <div className="shrink-0 self-center md:sticky md:top-24 md:self-start">
              <div className="block md:hidden">
                <CompositionDonut slices={visibleSlices} totalBRL={totalBRL} size={180} />
              </div>
              <div className="hidden md:block">
                <CompositionDonut slices={visibleSlices} totalBRL={totalBRL} size={200} />
              </div>
            </div>

            {/* Lista */}
            <div className="w-full min-w-0 flex-1">
              <ClassList slices={visibleSlices} />
            </div>
          </div>
        )}
      </PanelCard>
    </div>
  )
}
