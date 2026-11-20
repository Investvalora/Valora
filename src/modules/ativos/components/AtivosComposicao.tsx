import { InformationHelp } from '../../../shared/components/InformationHelp'
import { LoadingState } from '../../../shared/components/LoadingState'
import { useQuery } from '@tanstack/react-query'
import { sectorService } from '../services/sectorService'
import { AssetValuationNotice } from './AssetValuationNotice'
import { AllocationTargets } from './AllocationTargets'
import { useAtivosValuation } from '../hooks/useAtivosValuation'
/**
 * AtivosComposicao — sub-rota /ativos/composicao
 *
 * Exibe KpiBarAtivos + donut chart à esquerda com label central
 * e lista de classes à direita.
 */
import { useMemo, useRef, useState } from 'react'
import { useWallets } from '../../portfolio/hooks/useWallets'
import { deriveComposition, assetClassColor, assetClassLabel, isInternationalClass } from '../../portfolio/composition'
import { KpiBarAtivos } from './KpiBarAtivos'
import { ResumoCarteiraPopover } from './ResumoCarteiraPopover'
import { fmtMoney, fmtPct } from '../utils/fmt'
import type { AssetClassSlice } from '../../portfolio/types'
import { useDividendTotals } from '../../portfolio/hooks/useDividendTotals'
import { buildAssetSlices, buildSectorSlices, type CompositionSlice } from '../utils/compositionSlices'
import { useAssetFilters } from '../hooks/useAssetFilters'
import { useAllocationTargets } from '../hooks/useAllocationTargets'
import { useCompositionMotion } from '../hooks/useCompositionMotion'
import { ALLOCATION_CLASSES, allocationGap, validTargets } from '../utils/allocationTargets'
import { CompositionNote } from './CompositionNote'
import type { CompositionMotionSlice } from '../utils/compositionMotion'

type DisplaySlice = CompositionMotionSlice

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
  slices: DisplaySlice[]
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
  const sectors = slices.filter((s) => s.percent > 0).map((s) => {
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
      <g>
      {sectors.map(({ slice, startDeg, endDeg }, index) => (
        <path
          key={index}
          d={sectorPath(startDeg, endDeg)}
          fill={slice.color}
          fillOpacity={0.88 * (slice.opacity ?? 1)}
          aria-label={`${slice.label}: ${fmtPct(slice.percent)}`}
        >
          <title>{`${slice.label}: ${fmtMoney(slice.valueBRL)} (${fmtPct(slice.percent).replace('+', '')})${slice.target === undefined ? '' : ` · Meta: ${fmtPct(slice.target).replace('+', '')} · Diferença: ${slice.gap == null ? '—' : `${slice.gap > 0 ? '+' : ''}${fmtMoney(slice.gap)}`}`}`}</title>
        </path>
      ))}
      </g>
      {/* Labels externos de % — apenas fatias > 4% */}
      {sectors
        .filter(({ pct }) => pct > 4)
        .map(({ slice, midDeg }, index) => {
          const pt = polar(CX, CY, LABEL_RADIUS, midDeg)
          return (
            <text
              key={index}
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
              {Math.round(slice.percent)}%
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
function ClassList({ slices, progress, showTargets }: { slices: DisplaySlice[]; progress: number; showTargets: boolean }) {
  return (
    <div className="flex flex-col gap-3" style={{ filter: `blur(${progress >= 1 ? 0 : Math.sin(Math.PI * progress) * 2}px)` }}>
      {slices.map((s, index) => {
        const color = s.color
        const isIntl = s.international
        const barWidth = Math.min(100, Math.max(0, s.percent))

        return (
          <div key={index} className="flex flex-col gap-1.5" style={{ opacity: s.opacity ?? 1 }}>
            <div className="flex min-w-0 items-center gap-2 md:hidden">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-[13px] text-white/80">{s.label}</span>
                <span className="shrink-0 text-[12px] font-medium text-white tabular-nums">{fmtMoney(s.valueBRL)}</span>
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
            <div className="relative h-1.5 w-full rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full"
                style={{ width: `${barWidth}%`, background: color }}
                aria-hidden="true"
              />
              {s.target !== undefined && <span
                className="absolute -top-1 h-3.5 w-0.5 rounded-full bg-white/80"
                style={{ left: `clamp(0px, ${s.target}%, calc(100% - 2px))` }}
                title={`Meta: ${s.target}%`}
                aria-hidden="true"
              />}
            </div>
            <div className="flex items-center justify-between gap-2 text-[11px] tabular-nums md:hidden">
              <span className="text-white/50">{fmtPct(s.percent).replace('+', '')}</span>
              {showTargets && <>
                <span className="text-white/50">Meta {s.target === undefined ? '—' : fmtPct(s.target).replace('+', '')}</span>
                <span
                  aria-label={`Diferença para a meta de ${s.label}`}
                  title="Diferença em R$: positivo = falta para a meta; negativo = acima da meta"
                  className={s.gap == null || s.gap === 0 ? 'text-white/50' : s.gap > 0 ? 'text-nf-green' : 'text-nf-pink'}
                >{s.gap == null ? '—' : `${s.gap > 0 ? '+' : ''}${fmtMoney(s.gap)}`}</span>
              </>}
            </div>
            {showTargets && <div className="hidden flex-wrap justify-between gap-x-3 gap-y-1 text-[11px] tabular-nums md:flex">
              <span className="text-white/50">Meta <span className="text-white/80">{s.target === undefined ? '—' : fmtPct(s.target).replace('+', '')}</span></span>
              <span className="text-white/50">Diferença <span className={s.gap == null || s.gap === 0 ? 'text-white/70' : s.gap > 0 ? 'text-nf-green' : 'text-nf-pink'}>{s.gap == null ? '—' : `${s.gap > 0 ? '+' : ''}${fmtMoney(s.gap)}`}</span></span>
            </div>}
          </div>
        )
      })}
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────

const TOGGLE_OPTIONS = ['Tipo de ativos', 'Ativos', 'Setor', 'Exposição ao exterior'] as const
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
    for (const v of dividendTotalsByTicker.values()) { if (v === null) return null; total += v }
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
  const [targetEditorOpen, setTargetEditorOpen] = useState(false)
  const [sectorDetailsOpen, setSectorDetailsOpen] = useState(false)
  const targetsQuery = useAllocationTargets(walletId, showIdeal)
  const fullValuation = useAtivosValuation(walletId, true)
  const classView = activeToggle === 'Tipo de ativos' || activeToggle === 'Exposição ao exterior'
  // Mesma base da tabela: as metas são sempre da carteira inteira.
  const comparisonComposition = useMemo(() => deriveComposition(fullValuation.compositionRows, fullValuation.totalBRL), [fullValuation.compositionRows, fullValuation.totalBRL])
  const chartComposition = showIdeal && classView ? comparisonComposition : composition
  const chartTotal = showIdeal && classView ? fullValuation.totalBRL : totalBRL
  const sectorQuery = useQuery({
    queryKey: ['assets', 'sectors', 'brapi'], queryFn: sectorService.list,
    enabled: activeToggle === 'Setor', staleTime: 86400000, gcTime: 86400000, retry: 1,
  })


  // Filtrar slices pelo toggle ativo
  const visibleSlices = useMemo(() => {
    if (activeToggle === 'Setor') return buildSectorSlices(compositionRows, totalBRL, sectorQuery.data ?? [])
    if (activeToggle === 'Ativos') return buildAssetSlices(compositionRows, totalBRL)
    const slices = activeToggle === 'Exposição ao exterior'
      ? chartComposition.slices.filter((s) => isInternationalClass(s.type))
      : chartComposition.slices
    return slices.map((slice: AssetClassSlice): CompositionSlice => ({
      ...slice, id: slice.type, color: assetClassColor(slice.type), international: isInternationalClass(slice.type),
    }))
  }, [chartComposition.slices, activeToggle, compositionRows, totalBRL, sectorQuery.data])

  const displaySlices = useMemo<DisplaySlice[]>(() => {
    if (!showIdeal || !classView) return visibleSlices
    const targets = targetsQuery.data ?? {}
    const ready = !fullValuation.isLoading && !fullValuation.isError && fullValuation.complete
      && !targetsQuery.isError && validTargets(targets) && Object.keys(targets).length > 0
    const slices = [...visibleSlices]
    for (const type of ALLOCATION_CLASSES) {
      if ((targets[type] ?? 0) > 0 && !slices.some(slice => slice.id === type)
        && (activeToggle !== 'Exposição ao exterior' || isInternationalClass(type))) {
        slices.push({ id: type, label: assetClassLabel(type), color: assetClassColor(type), international: isInternationalClass(type), valueBRL: 0, percent: 0, topTicker: null })
      }
    }
    return slices.map(slice => {
      const target = !targetsQuery.isError ? targets[slice.id as typeof ALLOCATION_CLASSES[number]] : undefined
      return { ...slice, target, gap: ready && target !== undefined ? allocationGap(fullValuation.totalBRL, slice.valueBRL, target) : null }
    })
  }, [showIdeal, classView, visibleSlices, targetsQuery.data, targetsQuery.isError, fullValuation.isLoading, fullValuation.isError, fullValuation.complete, fullValuation.totalBRL, activeToggle])
  const motion = useCompositionMotion(walletId, { slices: displaySlices, totalBRL: chartTotal })
  const description = activeToggle === 'Setor'
    ? 'Setores de ações BR e BDRs via Brapi. Ativos sem classificação ficam agrupados.'
    : showIdeal
      ? classView
        ? 'Carteira inteira · traço = meta · diferença positiva = falta; negativa = acima.'
        : 'As metas são definidas por classe. Compare em Tipo de ativos ou ajuste as metas abaixo.'
      : activeToggle === 'Ativos'
        ? 'Participação de cada ativo no patrimônio da carteira.'
        : activeToggle === 'Exposição ao exterior'
          ? 'Classes internacionais e sua participação no patrimônio total.'
          : 'Distribuição do patrimônio por classe de ativo.'
  const targetNotice = !showIdeal || !classView ? ''
    : targetsQuery.isLoading ? 'Carregando metas…'
      : targetsQuery.isError ? 'Não foi possível carregar as metas.'
        : Object.keys(targetsQuery.data ?? {}).length === 0 ? 'Defina suas metas em Ajustar metas.'
          : fullValuation.isError || !fullValuation.complete ? 'A diferença aguarda a avaliação completa das posições.' : ''

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
      <section className="min-w-0 md:rounded-[14px] md:border md:border-white/[0.08] md:bg-[#1B1B1B] md:p-6" aria-label="Composição da carteira">
        {/* Cabeçalho */}
        <div className="mb-5 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-1">
            <h2 className="text-[14px] font-semibold text-white">
              {activeToggle === 'Setor' ? 'Composição por setor' : activeToggle === 'Ativos' ? 'Composição por ativo' : activeToggle === 'Exposição ao exterior' ? 'Exposição ao exterior' : 'Composição por classe'}
            </h2>
              <InformationHelp topic="allocation" />
            </div>
            {/* Switch posição ideal */}
            <div className="flex shrink-0 items-center gap-2">
              <span aria-hidden="true" className="text-[11px] text-white/60 md:text-[12px] md:text-white/50">
                <span className="md:hidden">Posição ideal</span>
                <span className="hidden md:inline">Exibir posição ideal</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={showIdeal}
                aria-label="Exibir posição ideal"
                onClick={() => setShowIdeal((v) => !v)}
                title="Exibir posição ideal"
                className="relative inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-blue md:min-h-0 md:min-w-0"
              >
                <span className={`relative h-5 w-9 rounded-full transition-colors ${showIdeal ? 'bg-nf-blue' : 'bg-white/[0.12]'}`}>
                  <span
                    className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ease-out motion-reduce:transition-none ${
                      showIdeal ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </span>
              </button>
            </div>
          </div>
          <div className="grid min-w-0 grid-cols-4 rounded-2xl border border-white/[0.12] bg-white/[0.04] p-1 md:flex md:self-start md:rounded-full" role="group" aria-label="Visualizar composição por">
            {TOGGLE_OPTIONS.map((opt) => (
              <button key={opt} type="button" aria-pressed={activeToggle === opt} onClick={() => setActiveToggle(opt)}
                className={`relative isolate flex min-h-11 min-w-0 items-center justify-center rounded-xl px-1.5 py-2 text-center text-[11px] font-medium leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-blue motion-reduce:transition-none md:min-h-0 md:whitespace-nowrap md:rounded-full md:px-3.5 md:py-1.5 md:text-[12px] ${activeToggle === opt ? 'text-white' : 'text-white/50 hover:text-white/80'}`}>
                {activeToggle === opt && <span className="composition-tab-active absolute inset-0 -z-10 rounded-[inherit] bg-white/[0.12]" aria-hidden="true" />}
                {opt}
              </button>
            ))}
          </div>
        </div>

        <p className="h-12 text-[11px] leading-4 text-white/50 md:h-10 md:text-xs" data-testid="composition-description">
          <CompositionNote text={description} />
        </p>
        {(showIdeal && classView ? fullValuation.isLoading : isLoading) ? (
          <div className="flex h-[200px] items-center justify-center">
            <LoadingState label="Carregando composição…" variant="table" />
          </div>
        ) : displaySlices.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center">
            <p className="text-[13px] text-[#8F8F8F]">{query || types.length ? 'Nenhum ativo corresponde aos filtros selecionados.' : 'Nenhuma posição avaliada.'}</p>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-8 md:flex-row">
            {/* Donut com espaço para leitura em ambas as telas */}
            <div className="shrink-0 self-center md:sticky md:top-24 md:self-start">
              <CompositionDonut slices={motion.frame.slices} totalBRL={motion.frame.totalBRL} size={240} />
            </div>

            {/* Lista */}
            <div className="w-full min-w-0 flex-1">
              <ClassList slices={motion.frame.slices} progress={motion.progress} showTargets={showIdeal && classView} />
            </div>
          </div>
        )}
        {activeToggle === 'Setor' && <div className="mt-4 text-xs leading-relaxed text-white/50">
          {sectorQuery.isLoading && <LoadingState label="Buscando classificação por setor…" />}
          {sectorQuery.isError && <p role="alert">Não foi possível atualizar os setores. A classificação já disponível foi mantida. <button type="button" className="underline" onClick={() => void sectorQuery.refetch()}>Tentar novamente</button></p>}
          <button type="button" aria-expanded={sectorDetailsOpen} aria-controls="composition-sector-details" onClick={() => setSectorDetailsOpen(open => !open)} className="min-h-11 text-white/50 underline decoration-white/20 underline-offset-4 hover:text-white/80">
            Sobre os setores {sectorDetailsOpen ? '−' : '+'}
          </button>
          <div className="composition-disclosure" data-open={sectorDetailsOpen} aria-hidden={!sectorDetailsOpen}>
            <div className="min-h-0 overflow-hidden">
              <p id="composition-sector-details" className="pb-3">
                <CompositionNote animate={sectorDetailsOpen} text="Classificação por setor da Brapi para ações brasileiras e BDRs. Sem classificação confiável, empresas e fundos ficam em “Não classificado”. ETFs, cripto e renda fixa ficam em “Sem setor econômico”; o total da carteira é preservado." />
              </p>
            </div>
          </div>
        </div>}
        {showIdeal && <>
          {targetNotice && <p role={targetsQuery.isError ? 'alert' : 'status'} className="mt-3 text-xs text-white/50">
            {targetNotice} {targetsQuery.isError && <button type="button" className="underline" onClick={() => void targetsQuery.refetch()}>Tentar novamente</button>}
          </p>}
          <button type="button" aria-expanded={targetEditorOpen} aria-controls="composition-target-editor" onClick={() => setTargetEditorOpen(open => !open)} className="mt-4 flex min-h-11 w-full items-center justify-between border-t border-white/10 text-xs text-white/60 md:hidden">
            Ajustar metas <span aria-hidden="true">{targetEditorOpen ? '−' : '+'}</span>
          </button>
          <div id="composition-target-editor" className={targetEditorOpen ? 'block' : 'hidden md:block'}>
            <AllocationTargets key={walletId} walletId={walletId} />
          </div>
        </>}
      </section>
    </div>
  )
}
