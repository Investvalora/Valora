/**
 * AtivosPage — tela do novo fluxo desktop
 *
 * Reutiliza todos os hooks já existentes (usePositions, useDashboard,
 * useLatestQuotes, useDividendTotals, useBazin, useWallets) sem duplicar
 * lógica de derivação — apenas substitui o visual pelo novo design.
 */
import { useMemo, useState } from 'react'
import { BarChart2, Coins, Filter, Plus, Wallet } from 'lucide-react'
import { KpiCard } from '../../../shared/components/KpiCard'
import { PanelCard } from '../../../shared/components/PanelCard'
import { Modal } from '../../../shared/components/Modal'
import { AddPositionForm } from '../../portfolio/components/AddPositionForm'
import { useWallets } from '../../portfolio/hooks/useWallets'
import { usePositions } from '../../portfolio/hooks/usePositions'
import { useLatestQuotes } from '../../portfolio/hooks/useLatestQuotes'
import { useDividendTotals } from '../../portfolio/hooks/useDividendTotals'
import { useBazin } from '../../valuation/hooks/useBazin'
import { useDashboard } from '../../dashboard/hooks/useDashboard'
import { useFundamentals } from '../../score/hooks/useFundamentals'
import { derivePositionRows } from '../../portfolio/positionRows'
import { enrichPositionRows } from '../../portfolio/enrichPositionRows'
import { deriveComposition } from '../../portfolio/composition'
import { useUSDRate } from '../../../shared/hooks/useUSDRate'
import type { AssetCurrency } from '../../portfolio/types'
import { AtivosTable } from './AtivosTable'
import { AlocacaoDonut } from './AlocacaoDonut'
import { fmtMoney, fmtPct } from '../utils/fmt'

export function AtivosPage() {
  const { selectedWallet } = useWallets()
  const walletId = selectedWallet?.id ?? ''

  // ── modal adicionar ativo ─────────────────────────────────────────────────
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addBusy, setAddBusy] = useState(false)

  // ── dados brutos ──────────────────────────────────────────────────────────
  const { data: positions = [], isLoading } = usePositions(walletId)
  const dashboard = useDashboard(walletId)

  const tickers = useMemo(() => positions.map((p) => p.ticker), [positions])
  const { data: quotes = [] } = useLatestQuotes(tickers)

  const hasUSD = useMemo(() => positions.some((p) => p.asset?.currency === 'USD'), [positions])
  const { data: usdRateData } = useUSDRate({ enabled: hasUSD })
  const usdRate = usdRateData?.rate ?? null

  const { data: fundamentalsList = [] } = useFundamentals(tickers)
  const fundamentalsByTicker = useMemo(
    () => new Map(fundamentalsList.map((f) => [f.ticker, f])),
    [fundamentalsList],
  )

  const quantityByTicker = useMemo(
    () => new Map(positions.map((p) => [p.ticker, p.quantity])),
    [positions],
  )
  const dividendTotals = useDividendTotals(tickers, quantityByTicker)

  const currencyMap = useMemo<Map<string, AssetCurrency>>(
    () => new Map(positions.map((p) => [p.ticker, p.asset?.currency ?? 'BRL'])),
    [positions],
  )
  const { bazinByTicker } = useBazin(tickers, 0.06, currencyMap)

  // ── derivação ─────────────────────────────────────────────────────────────
  const derived = useMemo(
    () => derivePositionRows({ positions, quotes, usdRate }),
    [positions, quotes, usdRate],
  )

  const enriched = useMemo(
    () =>
      enrichPositionRows({
        rows: derived.rows,
        fundamentalsByTicker,
        dividendTotalsByTicker: dividendTotals,
        bazinByTicker,
      }),
    [derived.rows, fundamentalsByTicker, dividendTotals, bazinByTicker],
  )

  // ordenar por valor de mercado desc
  const rows = useMemo(
    () =>
      [...enriched].sort((a, b) => {
        if (a.marketValueBRL === null) return 1
        if (b.marketValueBRL === null) return -1
        return b.marketValueBRL - a.marketValueBRL
      }),
    [enriched],
  )

  // ── composição por classe ─────────────────────────────────────────────────
  const composition = useMemo(
    () => deriveComposition(derived.rows, derived.totalBRL),
    [derived.rows, derived.totalBRL],
  )

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalPosicao = derived.totalBRL > 0 ? derived.totalBRL : null
  const valorInvestido = dashboard.valorInvestidoBRL
  const lucroPrejuizo =
    totalPosicao !== null && valorInvestido !== null ? totalPosicao - valorInvestido : null
  const lucroPrejuizoPct =
    valorInvestido !== null && valorInvestido > 0 && lucroPrejuizo !== null
      ? (lucroPrejuizo / valorInvestido) * 100
      : null

  // DY médio ponderado (média ponderada pelo valor de mercado)
  const dyMedio = useMemo(() => {
    let weightedSum = 0
    let weightedTotal = 0
    for (const row of enriched) {
      if (row.marketValueBRL !== null && row.dy !== undefined && row.dy !== null) {
        weightedSum += row.dy * row.marketValueBRL
        weightedTotal += row.marketValueBRL
      }
    }
    return weightedTotal > 0 ? weightedSum / weightedTotal : null
  }, [enriched])

  const positionCount = positions.length

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5 pt-2">
      {/* ── Cabeçalho ── */}
      <div className="flex items-center gap-3">
        <h1 className="text-[22px] font-semibold text-white">Ativos</h1>
        {positionCount > 0 && (
          <span className="rounded-full bg-[#393939] px-2.5 py-0.5 text-[12px] text-[#8F8F8F]">
            {positionCount} {positionCount === 1 ? 'ativo' : 'ativos'}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="
              flex items-center gap-1.5 rounded-full
              border border-white/[0.1] bg-[#393939]
              px-3.5 py-1.5 text-[13px] font-medium text-white
              transition-colors hover:bg-white/[0.12]
            "
          >
            <Filter className="h-3.5 w-3.5 text-white/70" strokeWidth={1.8} aria-hidden="true" />
            Filtrar
          </button>
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="
              flex items-center gap-1.5 rounded-full
              border border-white/[0.1] bg-[#393939]
              px-3.5 py-1.5 text-[13px] font-medium text-white
              transition-colors hover:bg-white/[0.12]
            "
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
            Adicionar ativo
          </button>
        </div>
      </div>

      {/* ── 4 KPIs ── */}
      <div className="flex gap-4">
        <KpiCard
          label="Valor total investido"
          value={fmtMoney(valorInvestido)}
          icon={Wallet}
        />
        <KpiCard
          label="Posição atual"
          value={fmtMoney(totalPosicao)}
          icon={Coins}
        />
        <KpiCard
          label="Lucro / Prejuízo"
          value={fmtMoney(lucroPrejuizo)}
          valueColor={
            lucroPrejuizo === null ? 'text-white'
            : lucroPrejuizo >= 0 ? 'text-nf-green'
            : 'text-nf-pink'
          }
          icon={BarChart2}
          arrowUp={lucroPrejuizo !== null && lucroPrejuizo > 0}
          sub={
            lucroPrejuizoPct !== null
              ? [{ label: 'Variação', value: fmtPct(lucroPrejuizoPct), valueColor: lucroPrejuizo !== null && lucroPrejuizo >= 0 ? 'text-nf-green' : 'text-nf-pink' }]
              : undefined
          }
        />
        <KpiCard
          label="Dividend Yield médio"
          value={dyMedio !== null ? fmtPct(dyMedio) + ' a.a.' : '—'}
          valueColor="text-nf-yellow"
          icon={Coins}
        />
      </div>

      {/* ── Tabela + Donut ── */}
      <div className="flex gap-5">
        {/* Painel tabela */}
        <PanelCard className="min-w-0 flex-1 overflow-hidden" padding="pt-5 pb-4 px-0">
          {/* Cabeçalho do painel */}
          <div className="mb-1 flex items-center justify-between px-5">
            <h2 className="text-[14px] font-semibold text-white/80">Posições</h2>
            {derived.missingValueCount > 0 && (
              <span className="text-[11px] text-[#8F8F8F]">
                {derived.missingValueCount}{' '}
                {derived.missingValueCount === 1 ? 'ativo sem cotação' : 'ativos sem cotação'}
              </span>
            )}
          </div>

          <AtivosTable rows={rows} isLoading={isLoading} />

          {/* Rodapé */}
          {rows.length > 0 && (
            <div className="mt-3 flex justify-center">
              <a
                href="/carteira"
                className="text-[12px] font-medium text-nf-blue hover:underline"
              >
                Gerenciar posições →
              </a>
            </div>
          )}
        </PanelCard>

        {/* Painel Alocação */}
        <PanelCard className="w-[272px] shrink-0" padding="p-5">
          <h2 className="mb-5 text-[14px] font-semibold text-white/80">
            Alocação por classe
          </h2>
          <AlocacaoDonut slices={composition.slices} />
        </PanelCard>
      </div>

      {/* ── Modal adicionar ativo ── */}
      <Modal
        isOpen={addModalOpen}
        title="Adicionar ativo"
        onClose={() => { if (!addBusy) setAddModalOpen(false) }}
        dismissible={!addBusy}
      >
        <AddPositionForm
          onSuccess={() => setAddModalOpen(false)}
          onCancel={() => setAddModalOpen(false)}
          onBusyChange={setAddBusy}
        />
      </Modal>
    </div>
  )
}
