/**
 * AtivosPosicoes — sub-rota /ativos/posicoes
 *
 * Exibe KpiBarAtivos com os 4 valores e a tabela de posições agrupada
 * por classe de ativo com todas as colunas do Figma.
 */
import { useMemo, useRef, useState } from 'react'
import { Download, Filter } from 'lucide-react'
import { useWallets } from '../../portfolio/hooks/useWallets'
import { usePositions } from '../../portfolio/hooks/usePositions'
import { useLatestQuotes } from '../../portfolio/hooks/useLatestQuotes'
import { useDividendTotals } from '../../portfolio/hooks/useDividendTotals'
import { useFundamentals } from '../../score/hooks/useFundamentals'
import { useBazin } from '../../valuation/hooks/useBazin'
import { useUSDRate } from '../../../shared/hooks/useUSDRate'
import { derivePositionRows } from '../../portfolio/positionRows'
import { enrichPositionRows } from '../../portfolio/enrichPositionRows'
import { KpiBarAtivos } from './KpiBarAtivos'
import { ResumoCarteiraPopover } from './ResumoCarteiraPopover'
import { AtivosTable } from './AtivosTable'
import { PanelCard } from '../../../shared/components/PanelCard'
import { fmtMoney, fmtPct } from '../utils/fmt'
import type { AssetCurrency } from '../../portfolio/types'
import type { FundamentalsRow } from '../../score/types'

export function AtivosPosicoes() {
  const { selectedWallet } = useWallets()
  const walletId = selectedWallet?.id ?? ''

  // ── Dados ────────────────────────────────────────────────────────────────

  const { data: positions = [], isLoading: posLoading } = usePositions(walletId)
  const tickers = useMemo(() => positions.map((p) => p.ticker), [positions])

  const { data: quotes = [], isLoading: quotesLoading } = useLatestQuotes(tickers)
  const { data: usdRateData } = useUSDRate()
  const usdRate = usdRateData?.rate ?? 5

  // DividendTotals requer Map<ticker, quantity>
  const quantityByTicker = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of positions) m.set(p.ticker, Number(p.quantity))
    return m
  }, [positions])

  const dividendTotalsByTicker = useDividendTotals(tickers, quantityByTicker)

  const { data: fundamentalsRows = [] } = useFundamentals(tickers)
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

  const { bazinByTicker } = useBazin(tickers, 0.06, currencyByTicker)

  // ── Derivação ─────────────────────────────────────────────────────────────

  const { rows: baseRows, totalBRL } = useMemo(
    () =>
      derivePositionRows({
        positions,
        quotes,
        usdRate,
      }),
    [positions, quotes, usdRate],
  )

  const enrichedRows = useMemo(
    () =>
      enrichPositionRows({
        rows: baseRows,
        fundamentalsByTicker,
        dividendTotalsByTicker,
        bazinByTicker,
      }),
    [baseRows, fundamentalsByTicker, dividendTotalsByTicker, bazinByTicker],
  )

  // ── KPI values ───────────────────────────────────────────────────────────

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

  // ── Resumo Popover ────────────────────────────────────────────────────────

  const [isResumoOpen, setIsResumoOpen] = useState(false)
  const resumoBtnRef = useRef<HTMLButtonElement | null>(null)

  const isLoading = posLoading || quotesLoading

  return (
    <div className="flex flex-col gap-5">
      {/* ── KPI bar com botão de resumo ── */}
      <div className="relative">
        <KpiBarAtivos
          patrimonio={fmtMoney(totalBRL > 0 ? totalBRL : null)}
          valorInvestido={fmtMoney(valorInvestidoBRL)}
          ganhoCapital={fmtMoney(ganhoCapitalBRL)}
          ganhoCapitalPositive={
            ganhoCapitalBRL === null ? null : ganhoCapitalBRL >= 0
          }
          ativos={enrichedRows.length}
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

      {/* ── Tabela de posições ── */}
      <PanelCard padding="p-0">
        {/* Cabeçalho do card */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-[14px] font-semibold text-white">
            Posições
          </h2>
          <span className="rounded-full bg-white/[0.08] px-2.5 py-0.5 text-[11px] font-medium text-white/60">
            {enrichedRows.length}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="
                flex items-center gap-1.5 rounded-full
                border border-white/[0.1] bg-transparent
                px-3.5 py-1.5 text-[12px] font-medium text-white/60
                transition-colors hover:bg-white/[0.06] hover:text-white
              "
            >
              <Filter className="h-3 w-3" strokeWidth={1.8} aria-hidden="true" />
              Filtrar
            </button>
            <button
              type="button"
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

        <AtivosTable
          rows={enrichedRows}
          totalBRL={totalBRL}
          isLoading={isLoading}
        />
      </PanelCard>
    </div>
  )
}
