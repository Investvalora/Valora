/**
 * AtivosComposicao — sub-rota /ativos/composicao
 *
 * Exibe KpiBarAtivos + donut chart à esquerda com label central
 * e lista de classes à direita.
 */
import { useMemo, useRef, useState } from 'react'
import { useWallets } from '../../portfolio/hooks/useWallets'
import { usePositions } from '../../portfolio/hooks/usePositions'
import { useLatestQuotes } from '../../portfolio/hooks/useLatestQuotes'
import { useUSDRate } from '../../../shared/hooks/useUSDRate'
import { derivePositionRows } from '../../portfolio/positionRows'
import { deriveComposition, assetClassColor, isInternationalClass } from '../../portfolio/composition'
import { KpiBarAtivos } from './KpiBarAtivos'
import { ResumoCarteiraPopover } from './ResumoCarteiraPopover'
import { PanelCard } from '../../../shared/components/PanelCard'
import { fmtMoney, fmtPct } from '../utils/fmt'
import type { AssetClassSlice } from '../../portfolio/types'
import { useDividendTotals } from '../../portfolio/hooks/useDividendTotals'

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
  slices: AssetClassSlice[]
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
    const startDeg = angle + GAP_DEG / 2
    const sweep = (pct / 100) * 360
    const endDeg = angle + sweep - GAP_DEG / 2
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
          key={slice.type}
          d={sectorPath(startDeg, endDeg)}
          fill={assetClassColor(slice.type)}
          fillOpacity={0.88}
          aria-label={`${slice.label}: ${fmtPct(slice.percent)}`}
        />
      ))}
      {/* Labels externos de % — apenas fatias > 4% */}
      {sectors
        .filter(({ pct }) => pct > 4)
        .map(({ slice, midDeg, pct }) => {
          const pt = polar(CX, CY, LABEL_RADIUS, midDeg)
          return (
            <text
              key={`lbl-${slice.type}`}
              x={pt.x.toFixed(2)}
              y={pt.y.toFixed(2)}
              textAnchor="middle"
              dominantBaseline="central"
              fill={assetClassColor(slice.type)}
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
function ClassList({ slices }: { slices: AssetClassSlice[] }) {
  return (
    <div className="flex flex-col gap-3">
      {slices.map((s) => {
        const color = assetClassColor(s.type)
        const isIntl = isInternationalClass(s.type)
        const barWidth = Math.min(100, Math.max(0, s.percent))

        return (
          <div key={s.type} className="flex flex-col gap-1.5">
            {/* Linha principal */}
            <div className="flex items-center gap-2">
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
  const { data: positions = [], isLoading: posLoading } = usePositions(walletId)
  const tickers = useMemo(() => positions.map((p) => p.ticker), [positions])
  const { data: quotes = [], isLoading: quotesLoading } = useLatestQuotes(tickers)
  const { data: usdRateData } = useUSDRate()
  const usdRate = usdRateData?.rate ?? 5

  const quantityByTicker = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of positions) m.set(p.ticker, Number(p.quantity))
    return m
  }, [positions])

  const dividendTotalsByTicker = useDividendTotals(tickers, quantityByTicker)

  // ── Derivação ─────────────────────────────────────────────────────────────
  const { rows, totalBRL } = useMemo(
    () => derivePositionRows({ positions, quotes, usdRate }),
    [positions, quotes, usdRate],
  )

  const composition = useMemo(() => deriveComposition(rows, totalBRL), [rows, totalBRL])

  // ── KPI values ────────────────────────────────────────────────────────────
  const valorInvestidoBRL = useMemo(() => {
    if (positions.length === 0) return null
    let total = 0
    for (const p of positions) {
      const qty = Number(p.quantity)
      const avgPrice = Number(p.average_price)
      const currency = p.asset?.currency ?? 'BRL'
      const rate = currency === 'USD' ? usdRate : 1
      total += qty * avgPrice * rate
    }
    return Number.isFinite(total) && total > 0 ? total : null
  }, [positions, usdRate])

  const ganhoCapitalBRL = useMemo(() => {
    if (totalBRL <= 0 || valorInvestidoBRL === null) return null
    return totalBRL - valorInvestidoBRL
  }, [totalBRL, valorInvestidoBRL])

  const proventos12mBRL = useMemo(() => {
    let total = 0
    for (const v of dividendTotalsByTicker.values()) total += v
    return total > 0 ? total : null
  }, [dividendTotalsByTicker])

  const rentabilidadePct = useMemo(() => {
    if (valorInvestidoBRL === null || valorInvestidoBRL <= 0 || totalBRL <= 0) return null
    return ((totalBRL - valorInvestidoBRL) / valorInvestidoBRL) * 100
  }, [totalBRL, valorInvestidoBRL])

  // ── Resumo popover ─────────────────────────────────────────────────────────
  const [isResumoOpen, setIsResumoOpen] = useState(false)
  const resumoBtnRef = useRef<HTMLButtonElement | null>(null)

  // ── UI state ───────────────────────────────────────────────────────────────
  const [activeToggle, setActiveToggle] = useState<ToggleOption>('Tipo de ativos')
  const [showIdeal, setShowIdeal] = useState(false)

  const isLoading = posLoading || quotesLoading

  // Filtrar slices pelo toggle ativo
  const visibleSlices = useMemo(() => {
    if (activeToggle === 'Exposição ao exterior') {
      return composition.slices.filter((s) => isInternationalClass(s.type))
    }
    return composition.slices
  }, [composition.slices, activeToggle])

  return (
    <div className="flex flex-col gap-5">
      {/* ── KPI bar ── */}
      <div className="relative overflow-x-auto md:overflow-visible">
        <KpiBarAtivos
          patrimonio={fmtMoney(totalBRL > 0 ? totalBRL : null)}
          valorInvestido={fmtMoney(valorInvestidoBRL)}
          ganhoCapital={fmtMoney(ganhoCapitalBRL)}
          ganhoCapitalPositive={
            ganhoCapitalBRL === null ? null : ganhoCapitalBRL >= 0
          }
          ativos={rows.length}
          onResumo={() => setIsResumoOpen((o) => !o)}
          resumoBtnRef={resumoBtnRef}
        />

        {isResumoOpen && (
          <ResumoCarteiraPopover
            anchorRef={resumoBtnRef}
            patrimonio={fmtMoney(totalBRL > 0 ? totalBRL : null)}
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
      <PanelCard>
        {/* Cabeçalho */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-[14px] font-semibold text-white">
            Composição por classe
          </h2>

          {/* Toggle segmentado */}
          <div className="flex items-center gap-4">
            <div className="flex rounded-full border border-white/[0.12] bg-white/[0.04] p-0.5">
              {TOGGLE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
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
            <label className="flex cursor-pointer items-center gap-2">
              <span className="text-[12px] text-white/50">Exibir posição ideal</span>
              <button
                type="button"
                role="switch"
                aria-checked={showIdeal}
                onClick={() => setShowIdeal((v) => !v)}
                className={`relative h-5 w-9 rounded-full transition-colors ${
                  showIdeal ? 'bg-nf-blue' : 'bg-white/[0.12]'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    showIdeal ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </label>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-[200px] items-center justify-center">
            <p className="text-[13px] text-[#8F8F8F] animate-pulse">Carregando composição…</p>
          </div>
        ) : composition.slices.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center">
            <p className="text-[13px] text-[#8F8F8F]">Nenhuma posição avaliada.</p>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-8 md:flex-row md:items-center">
            {/* Donut — 180px mobile, 200px desktop */}
            <div className="shrink-0 self-center md:self-auto">
              <div className="block md:hidden">
                <CompositionDonut slices={visibleSlices} totalBRL={totalBRL} size={180} />
              </div>
              <div className="hidden md:block">
                <CompositionDonut slices={visibleSlices} totalBRL={totalBRL} size={200} />
              </div>
            </div>

            {/* Lista */}
            <div className="flex-1 min-w-0">
              <ClassList slices={visibleSlices} />
            </div>
          </div>
        )}
      </PanelCard>
    </div>
  )
}
