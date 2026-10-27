import { AssetValuationNotice } from './AssetValuationNotice'
import { FixedIncomePositions } from './FixedIncomePositions'
import { useAtivosValuation } from '../hooks/useAtivosValuation'
/**
 * AtivosPosicoes — sub-rota /ativos/posicoes
 *
 * Exibe KpiBarAtivos com os 4 valores e a tabela de posições agrupada
 * por classe de ativo com todas as colunas do Figma.
 */
import { useMemo, useRef, useState } from 'react'
import { Download, Columns3 } from 'lucide-react'
import { downloadPositionsCsv } from '../../portfolio/export/positionsCsv'
import { AssetFilterButton } from './AssetFiltersPanel'
import { useAssetFilters } from '../hooks/useAssetFilters'
import { useAuth } from '../../auth/hooks/useAuth'
import { useAssetColumns } from '../hooks/useAssetColumns'
import { AssetColumnEditor } from './AssetColumnEditor'
import { useWallets } from '../../portfolio/hooks/useWallets'
import { useDividendTotals } from '../../portfolio/hooks/useDividendTotals'
import { useFundamentals } from '../../score/hooks/useFundamentals'
import { useScoreRules, groupRulesByName } from '../../score/hooks/useScoreRules'
import { useScorePreferences, useUpsertScorePreferences } from '../../score/hooks/useScorePreferences'
import { useCalculateScore } from '../../score/hooks/useCalculateScore'
import { useBazin } from '../../valuation/hooks/useBazin'
import { useStrategies } from '../../valuation/hooks/useStrategies'
import { enrichPositionRows } from '../../portfolio/enrichPositionRows'
import { groupRowsByClass } from '../../portfolio/composition'
import { KpiBarAtivos } from './KpiBarAtivos'
import { ResumoCarteiraPopover } from './ResumoCarteiraPopover'
import { AtivosTable } from './AtivosTable'
import { AssetGroupCard } from './AssetGroupCard'
import { PanelCard } from '../../../shared/components/PanelCard'
import { fmtMoney, fmtPct } from '../utils/fmt'
import type { AssetCurrency, AssetClassKey } from '../../portfolio/types'
import type { FundamentalsRow } from '../../score/types'

export function AtivosPosicoes() {
  const { user } = useAuth()
  const strategySettings = useStrategies()
  const columnSettings = useAssetColumns(user?.id ?? 'guest')
  const [isColumnEditorOpen, setIsColumnEditorOpen] = useState(false)
  const { selectedWallet } = useWallets()
  const walletId = selectedWallet?.id ?? ''

  // ── Dados ────────────────────────────────────────────────────────────────

  const { positions, tickers, rows: baseRows, fixedRows, totalBRL, patrimonioBRL, valorInvestidoBRL, assetCount, isLoading, isError, complete } = useAtivosValuation(walletId)
  const { query, types } = useAssetFilters()
  const hasFilters = Boolean(query || types.length)

  const quantityByTicker = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of positions) m.set(p.ticker, Number(p.quantity))
    return m
  }, [positions])

  const dividendTotalsByTicker = useDividendTotals(tickers, quantityByTicker)

  const { data: fundamentalsRows = [] } = useFundamentals(tickers)
  const rulesQuery = useScoreRules()
  const preferencesQuery = useScorePreferences()
  const saveScore = useUpsertScorePreferences()
  const allRules = useMemo(() => rulesQuery.data ?? [], [rulesQuery.data])
  const scoreNames = useMemo(() => Array.from(groupRulesByName(allRules).keys()).sort(), [allRules])
  const activeScoreName = allRules.find((rule) => rule.id === preferencesQuery.data?.default_score_rule_id)?.name ?? ''
  const activeRules = useMemo(() => allRules.filter((rule) => rule.name === activeScoreName), [allRules, activeScoreName])
  const scoreByTicker = useCalculateScore(activeRules, fundamentalsRows)
  const fundamentalsByTicker = useMemo(() => {
    const m = new Map<string, FundamentalsRow>()
    for (const f of fundamentalsRows) m.set(f.ticker, f)
    return m
  }, [fundamentalsRows])

  const currencyByTicker = useMemo(() => {
    const m = new Map<string, AssetCurrency>()
    for (const p of positions) {
      const currency = p.asset?.currency ?? 'BRL'
      m.set(p.ticker, currency as AssetCurrency)
    }
    return m
  }, [positions])

  const { bazinByTicker, isLoading: valuationLoading, isError: valuationError } = useBazin(tickers, 0.06, currencyByTicker)

  // ── Derivação ─────────────────────────────────────────────────────────────

  const enrichedBase = useMemo(
    () =>
      enrichPositionRows({
        rows: baseRows,
        fundamentalsByTicker,
        dividendTotalsByTicker,
        bazinByTicker,
      }),
    [baseRows, fundamentalsByTicker, dividendTotalsByTicker, bazinByTicker],
  )
  const enrichedRows = useMemo(() => enrichedBase.map((row) => ({ ...row,
    score: activeScoreName ? scoreByTicker.get(row.ticker) ?? null : undefined,
  })), [enrichedBase, activeScoreName, scoreByTicker])

  // ── KPI values ───────────────────────────────────────────────────────────

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

  // ── Resumo Popover ────────────────────────────────────────────────────────

  const [isResumoOpen, setIsResumoOpen] = useState(false)
  const resumoBtnRef = useRef<HTMLButtonElement | null>(null)

  // ── Mobile: grupos colapsáveis ────────────────────────────────────────────
  const groups = useMemo(
    () => groupRowsByClass(enrichedRows, totalBRL),
    [enrichedRows, totalBRL],
  )

  const [expandedGroups, setExpandedGroups] = useState<Set<AssetClassKey>>(
    () => new Set(groups.map((g) => g.summary.key)),
  )

  const toggleGroup = (key: AssetClassKey) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }


  return (
    <div className="flex flex-col gap-5">
      {strategySettings.isError && <p role="alert" className="text-sm text-amber-300">Não foi possível carregar suas estratégias. As referências personalizadas estão indisponíveis.</p>}
      {valuationLoading && <p role="status" className="text-xs text-white/45">Carregando histórico de mercado de 12 meses para os preços de referência…</p>}
      {valuationError && <p role="status" className="text-xs text-amber-300">Alguns históricos de proventos não puderam ser consultados. Os preços de referência afetados ficam indisponíveis; registros parciais não são usados como total anual.</p>}
      <AssetValuationNotice loading={Boolean(isLoading)} error={Boolean(isError)} complete={complete} />
      {/* ── KPI bar com botão de resumo ── */}
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

      {/* ── Tabela de posições — desktop ── */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-white/60">
        <label>Meu score
          <select aria-label="Score das posições" value={activeScoreName} disabled={rulesQuery.isLoading || preferencesQuery.isLoading || rulesQuery.isError || preferencesQuery.isError || saveScore.isPending}
            onChange={(event) => saveScore.mutate({ default_score_rule_id: allRules.find((rule) => rule.name === event.target.value)?.id ?? null })}
            className="ml-2 min-h-11 rounded-lg border border-white/15 bg-[#262626] px-3 text-white">
            <option value="">Sem score</option>
            {scoreNames.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        {scoreNames.length === 0 && !rulesQuery.isLoading && <span>Crie suas regras na página Score.</span>}
        {(rulesQuery.isError || preferencesQuery.isError || saveScore.isError) && <span role="alert" className="text-rose-300">Não foi possível carregar ou salvar o score. Tente novamente.</span>}
        {activeScoreName && <span>Veja a coluna “Meu score” em Editar colunas. Sem fundamentos: —.</span>}
      </div>
      <PanelCard padding="p-0">
        {/* Cabeçalho do card */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-[14px] font-semibold text-white">
            Meus ativos
          </h2>
          <span className="rounded-full bg-white/[0.08] px-2.5 py-0.5 text-[11px] font-medium text-white/60">
            {assetCount}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={() => setIsColumnEditorOpen(true)} className="hidden items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-1.5 text-xs font-medium text-white/70 hover:bg-white/5 md:flex">
              <Columns3 className="h-3.5 w-3.5" aria-hidden="true" />Editar colunas
            </button>
            <AssetFilterButton />
            <button
              type="button"
              onClick={() => downloadPositionsCsv(baseRows)}
              disabled={isLoading || baseRows.length === 0}
              title="Exportar posições de renda variável filtradas com as colunas padrão do CSV"
              className="
                flex items-center gap-1.5 rounded-full
                border border-white/[0.1] bg-transparent
                px-3.5 py-1.5 text-[12px] font-medium text-white/60
                transition-colors hover:bg-white/[0.06] hover:text-white
              "
            >
              <Download className="h-3 w-3" strokeWidth={1.8} aria-hidden="true" />
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Desktop: tabela completa */}
        <div className="hidden md:block">
          {!isLoading && groups.length > 0 ? <div className="space-y-5">{groups.map(({ summary, rows: groupRows }) => <AtivosTable
            key={summary.key}
            strategies={strategySettings.strategies}
            rows={groupRows}
            totalBRL={totalBRL}
            visibleColumns={columnSettings.columns}
            tableLabel={`Posições de ${summary.label}`}
          />)}</div> : <AtivosTable
            strategies={strategySettings.strategies}
            rows={enrichedRows}
            totalBRL={totalBRL}
            isLoading={isLoading}
            visibleColumns={columnSettings.columns}
            emptyMessage={fixedRows.length ? 'As posições de renda fixa estão listadas abaixo.' : hasFilters ? 'Nenhum ativo corresponde aos filtros selecionados.' : undefined}
          />}
        </div>

        {/* Mobile: lista de grupos colapsáveis */}
        <div className="block md:hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <p className="text-[13px] text-white/40 animate-pulse">Carregando posições…</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <p className="text-[13px] text-white/40">{fixedRows.length ? 'As posições de renda fixa estão listadas abaixo.' : hasFilters ? 'Nenhum ativo corresponde aos filtros selecionados.' : 'Nenhuma posição cadastrada.'}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 p-3">
              {groups.map(({ summary, rows: groupRows }) => (
                <AssetGroupCard
                  strategies={strategySettings.strategies}
                  key={summary.key}
                  type={summary.key}
                  label={summary.label}
                  color={summary.color}
                  totalBRL={summary.totalValueBRL}
                  variationPct={summary.avgChangePercent}
                  portfolioPct={summary.weightPercent}
                  rows={groupRows}
                  isExpanded={expandedGroups.has(summary.key)}
                  onToggle={() => toggleGroup(summary.key)}
                />
              ))}
            </div>
          )}
        </div>
        {!isLoading && <FixedIncomePositions rows={fixedRows} />}
      </PanelCard>
      {isColumnEditorOpen && <AssetColumnEditor columns={columnSettings.columns} onSave={columnSettings.save} onClose={() => setIsColumnEditorOpen(false)} />}
    </div>
  )
}
