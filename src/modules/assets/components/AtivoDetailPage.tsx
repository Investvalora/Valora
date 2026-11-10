import { FundamentalsPanel } from "./FundamentalsPanel";
import { ScoreBreakdown } from "../../score/components/ScoreBreakdown";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  Component,
} from "react";
import type { ErrorInfo, ReactNode } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Maximize2, Minimize2, Search } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";
import { PeriodSelector } from "../../wealth/components/PeriodSelector";
import { PanelCard } from "../../../shared/components/PanelCard";
import { useRetainedChartData } from "../../../shared/hooks/useRetainedChartData";
import { useChartMorph } from "../../../shared/hooks/useChartMorph";
import { blendValue, sampleCurve } from "../../../shared/utils/chartMorph";
import { useAssetDetail } from "../hooks/useAssetDetail";
import { AddTransactionModal } from "../../portfolio/components/AddTransactionModal";
import { PriceAlertForm } from "../../alerts/components/PriceAlertForm";
import { EditTransactionButton } from "../../portfolio/components/EditTransactionButton";
import { FavoriteButton } from "./FavoriteButton";
import { Modal } from "../../../shared/components/Modal";
import { usePriceHistory } from "../hooks/usePriceHistory";
import { useAssetDividends } from "../hooks/useAssetDividends";
import { useDividends } from "../../dividends/hooks/useDividends";
import { parseIsoDate } from "../../../shared/utils/isoDate";
import { useWallets } from "../../portfolio/hooks/useWallets";
import { useAtivosValuation } from "../../ativos/hooks/useAtivosValuation";
import { useDailyChange } from "../hooks/useDailyChange";
import { useLatestQuotes } from "../../portfolio/hooks/useLatestQuotes";
import { useFundamentals } from "../../score/hooks/useFundamentals";
import { useScoreRules } from "../../score/hooks/useScoreRules";
import { useScorePreferences } from "../../score/hooks/useScorePreferences";
import { useCalculateScore } from "../../score/hooks/useCalculateScore";
import { useBazin } from "../../valuation/hooks/useBazin";
import { useAlerts } from "../../alerts/hooks/useAlerts";
import { useDividendTotals } from "../../portfolio/hooks/useDividendTotals";
import { useAllTransactions } from "../../portfolio/hooks/useTransactions";
import { useAssetSearch } from "../../portfolio/hooks/useAssetSearch";
import { usePerformance } from "../../performance/hooks/usePerformance";
import { assetClassColor, assetClassLabel } from "../../portfolio/composition";
import { fmtMoney, fmtPct } from "../../ativos/utils/fmt";
import type { AssetCurrency } from "../../portfolio/types";
import type { PriceHistoryPeriod } from "../hooks/usePriceHistory";
import type { PricePoint } from "../types";

// ─── Constantes ──────────────────────────────────────────────────────────────

const PRICE_PERIODS: PriceHistoryPeriod[] = [
  "1M",
  "3M",
  "6M",
  "1A",
  "5A",
  "Tudo",
];
const MOBILE_CHART_WIDTH: Record<PriceHistoryPeriod, string> = {
  "1M": "min-w-[360px]",
  "3M": "min-w-[480px]",
  "6M": "min-w-[560px]",
  "1A": "min-w-[720px]",
  "5A": "min-w-[960px]",
  Tudo: "min-w-[1120px]",
};
const FULLSCREEN_CHART_WIDTH: Record<PriceHistoryPeriod, number> = {
  "1M": 900,
  "3M": 1300,
  "6M": 1700,
  "1A": 2200,
  "5A": 3000,
  Tudo: 3600,
};

const MISSING = "—";

// ─── Formatadores locais ──────────────────────────────────────────────────────

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return MISSING;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? parseIsoDate(iso) : new Date(iso);
  if (!d) return iso;
  return Number.isNaN(d.getTime()) ? iso : dateFormatter.format(d);
}

// ─── Tipos de Tab ─────────────────────────────────────────────────────────────

type AtivoTab =
  | "visao-geral"
  | "lancamentos"
  | "proventos"
  | "rentabilidade"
  | "score"
  | "alertas";

const TAB_LABELS: Record<AtivoTab, string> = {
  "visao-geral": "Visão geral",
  lancamentos: "Lançam.",
  proventos: "Proventos",
  rentabilidade: "Rentab.",
  score: "Score",
  alertas: "Alertas",
};

const TAB_KEYS: AtivoTab[] = [
  "visao-geral",
  "lancamentos",
  "proventos",
  "rentabilidade",
  "score",
  "alertas",
];

// ─── Error Boundary para o gráfico ────────────────────────────────────────────

class ChartErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn(
      "Gráfico de preços não pôde ser renderizado.",
      error,
      info.componentStack,
    );
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-[260px] items-center justify-center rounded-lg border border-white/[0.08]">
          <p className="text-sm text-[#8f8f8f]">Gráfico indisponível.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── SubTabBar interno (sem NavLink — controle via onClick) ───────────────────

interface InternalSubTabBarProps {
  activeTab: AtivoTab;
  onTabChange: (tab: AtivoTab) => void;
}

function InternalSubTabBar({ activeTab, onTabChange }: InternalSubTabBarProps) {
  return (
    <div className="flex w-full max-w-full gap-6 overflow-x-auto overscroll-x-contain border-b border-white/[0.08] touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:overflow-x-visible" role="tablist">
      {TAB_KEYS.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={activeTab === tab}
          onClick={() => onTabChange(tab)}
          className={[
            "shrink-0 border-b-2 px-0 pb-2.5 text-sm font-medium whitespace-nowrap transition-colors",
            activeTab === tab
              ? "border-nf-blue text-white"
              : "border-transparent text-white/50 hover:text-white/80",
          ].join(" ")}
        >
          {TAB_LABELS[tab]}
        </button>
      ))}
    </div>
  );
}

// ─── AssetDetailHero ──────────────────────────────────────────────────────────

interface AssetDetailHeroProps {
  ticker: string;
  name: string;
  type: string;
  color: string;
  currentPrice: number | null;
  dailyChangePct: number | null;
  currency: AssetCurrency;
  onBack: () => void;
  showBreadcrumb: boolean;
  onTransaction: () => void;
  onAlert: () => void;
}

function AssetDetailHero({
  ticker,
  name,
  type,
  color,
  currentPrice,
  dailyChangePct,
  currency,
  onBack,
  showBreadcrumb,
  onTransaction,
  onAlert,
}: AssetDetailHeroProps) {
  const initial = ticker.charAt(0).toUpperCase();
  const badgeBg = color + "29"; // ~16% opacity hex

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      {/* Breadcrumb */}
      {showBreadcrumb && (
        <div className="text-xs text-[#8f8f8f] flex items-center gap-1 mb-1">
          <button
            type="button"
            onClick={onBack}
            className="hover:text-white transition-colors"
          >
            ← Ativos
          </button>
          <span>/</span>
          <span className="text-white/60">Posições</span>
        </div>
      )}

      {/* Info row */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 w-full">
        {/* Avatar + info */}
        <div className="flex items-center gap-4">
          {/* Avatar 52×52 */}
          <div
            className="w-[52px] h-[52px] rounded-[10px] flex items-center justify-center flex-shrink-0 text-[20px] font-bold text-white"
            style={{ backgroundColor: color }}
          >
            {initial}
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[32px] font-medium text-white leading-none">
                {ticker}
              </span>
              {/* Badge de tipo */}
              <span
                className="rounded-full px-2 py-0.5 text-xs font-medium uppercase"
                style={{ backgroundColor: badgeBg, color }}
              >
                {type}
              </span>
            </div>
            <span className="text-[13px] text-[#8f8f8f]">{name}</span>
          </div>
        </div>

        {/* Cotação + variação */}
        <div className="flex flex-col gap-0.5 md:ml-6">
          <span className="text-[26px] font-semibold text-white tabular-nums">
            {currentPrice != null ? fmtMoney(currentPrice, currency) : MISSING}
          </span>
          {dailyChangePct != null && (
            <span
              className={`text-sm font-medium tabular-nums ${
                dailyChangePct >= 0 ? "text-nf-green" : "text-nf-pink"
              }`}
            >
              {fmtPct(dailyChangePct)} no último fechamento
            </span>
          )}
        </div>

        {/* Botões de ação — pushed to right on desktop */}
        <div className="flex flex-wrap gap-2 md:ml-auto">
          <FavoriteButton ticker={ticker} />
          <button
            type="button"
            onClick={onTransaction}
            className="rounded-[20px] bg-[#393939] px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-[#444] transition-colors"
          >
            + Lançamento do ativo
          </button>
          <button
            type="button"
            onClick={onAlert}
            className="rounded-[20px] bg-[#393939] px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-[#444] transition-colors"
          >
            Criar alerta
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AssetKpiGrid ─────────────────────────────────────────────────────────────

interface AssetKpiGridProps {
  quantity: number | null;
  avgPrice: number | null;
  balance: number | null;
  portfolioWeight: number | null;
  changeVsAvg: number | null;
  dy: number | null;
  currency: AssetCurrency;
}

function AssetKpiGrid({
  quantity,
  avgPrice,
  balance,
  portfolioWeight,
  changeVsAvg,
  dy,
  currency,
}: AssetKpiGridProps) {
  const kpis = [
    {
      label: "Quantidade",
      value: quantity != null ? quantity.toLocaleString("pt-BR") : MISSING,
    },
    {
      label: "Preço médio",
      value: avgPrice != null ? fmtMoney(avgPrice, currency) : MISSING,
    },
    {
      label: "Saldo",
      value: balance != null ? fmtMoney(balance, currency) : MISSING,
    },
    {
      label: "% da carteira",
      value: portfolioWeight != null ? fmtPct(portfolioWeight) : MISSING,
    },
    {
      label: "Variação (vs PM)",
      value: changeVsAvg != null ? fmtPct(changeVsAvg) : MISSING,
      color:
        changeVsAvg == null
          ? undefined
          : changeVsAvg >= 0
            ? "text-nf-green"
            : "text-nf-pink",
    },
    { label: "Dividend Yield", value: dy != null ? fmtPct(dy) : MISSING },
  ];

  return (
    <div className="grid grid-cols-2 gap-[10px] lg:grid-cols-6">
      {kpis.map(({ label, value, color }) => (
        <div
          key={label}
          className="border border-[rgba(144,144,144,0.55)] rounded-[10px] px-[14px] py-[12px]"
        >
          <p className="text-[11px] text-[#8f8f8f] mb-1">{label}</p>
          <p
            className={`text-sm font-semibold tabular-nums ${color ?? "text-white"}`}
          >
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── PriceLineChartWithAvg (gráfico com linha de preço médio) ─────────────────

interface PriceLineChartWithAvgProps {
  ticker: string;
  data: PricePoint[];
  avgPrice: number | null;
  currency?: string;
  period: PriceHistoryPeriod;
}

function canMorphPrices(from: PricePoint[], to: PricePoint[]) {
  return from.length > 1 && to.length > 1;
}

function morphPrices(from: PricePoint[], to: PricePoint[], progress: number): PricePoint[] {
  return to.map((point, index) => ({
    ...point,
    close: blendValue(
      sampleCurve(from, index / Math.max(1, to.length - 1), (item) => item.close),
      point.close,
      progress,
    ),
  }));
}

function formatAxisDate(value: string): string {
  if (typeof value !== "string" || value.length < 10) return value;
  const [, month, day] = value.split("-");
  return `${day}/${month}`;
}

function formatYAxis(value: number): string {
  if (!Number.isFinite(value)) return "";
  return value >= 100 ? value.toFixed(0) : value.toFixed(2);
}

function priceAxis(data: PricePoint[], avgPrice: number | null) {
  const values = data
    .map((point) => point.close)
    .filter(
      (value): value is number => value != null && Number.isFinite(value),
    );
  if (avgPrice != null && Number.isFinite(avgPrice)) values.push(avgPrice);
  const low = values.length ? Math.min(...values) : 0;
  const high = values.length ? Math.max(...values) : 1;
  const span = Math.max(high - low, Math.abs(high) * 0.02, 0.01);
  const roughStep = span / 4;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const step =
    ([1, 2, 2.5, 5, 10].find((factor) => factor * magnitude >= roughStep) ??
      10) * magnitude;
  let min = Math.floor(low / step) * step;
  let max = Math.ceil(high / step) * step;
  if (min === max) {
    min -= step;
    max += step;
  }
  const ticks = Array.from(
    { length: Math.round((max - min) / step) + 1 },
    (_, index) => Number((min + index * step).toPrecision(12)),
  );
  min = ticks[0];
  max = ticks[ticks.length - 1];
  return { min, max, ticks };
}

interface DualTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number | null; dataKey?: string; name?: string }>;
  label?: string;
  currency?: string;
}

function DualTooltip({
  active,
  payload,
  label,
  currency = "BRL",
}: DualTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const prefix = currency === "USD" ? "US$ " : "R$ ";
  const numFmt = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#1B1B1B] px-3 py-2 shadow-lg">
      {label && (
        <p className="text-xs text-[#8f8f8f] mb-1">
          {(() => {
            const parts = label.split("-");
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
          })()}
        </p>
      )}
      {payload.map((item, i) =>
        item.value != null && Number.isFinite(item.value) ? (
          <p key={i} className="text-sm font-semibold text-white">
            {item.name}: {prefix}
            {numFmt.format(item.value)}
          </p>
        ) : null,
      )}
    </div>
  );
}

function PriceLineChartWithAvg({
  ticker,
  data,
  avgPrice,
  currency = "BRL",
  period,
  fullscreen = false,
}: PriceLineChartWithAvgProps & { fullscreen?: boolean }) {
  const morphEnabled = typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const animatedData = useChartMorph(ticker, data, morphPrices, canMorphPrices, morphEnabled);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; scrollLeft: number } | null>(null);
  const axis = useMemo(() => priceAxis(animatedData, avgPrice), [animatedData, avgPrice]);
  useLayoutEffect(() => {
    const scrollArea = scrollRef.current;
    if (scrollArea)
      scrollArea.scrollLeft = scrollArea.scrollWidth - scrollArea.clientWidth;
  }, [period]);
  // Enrich data with avgPrice as a constant field
  const chartData = useMemo(
    () => animatedData.map((p) => ({ ...p, avgPrice: avgPrice ?? undefined })),
    [animatedData, avgPrice],
  );

  return (
    <div className={fullscreen ? "flex h-full min-h-0 flex-col" : ""}>
      {/* Legend */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-[#38bdf8] rounded" />
          <span className="text-xs text-[#8f8f8f]">Cotação</span>
        </div>
        {avgPrice != null && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-[#eab308] rounded border-dashed border-t-2 border-[#eab308]" />
            <span className="text-xs text-[#8f8f8f]">Preço médio</span>
          </div>
        )}
      </div>

      <div
        className={fullscreen ? "flex min-h-0 min-w-0 flex-1" : "flex min-w-0"}
      >
        <div
          aria-hidden="true"
          className={
            fullscreen
              ? "relative h-full w-11 shrink-0 bg-[#131313]"
              : "relative h-[280px] w-11 shrink-0 bg-[#1B1B1B] md:h-[260px]"
          }
        >
          <div className="absolute inset-x-0 bottom-[38px] top-2">
            {axis.ticks.map((tick) => (
              <span
                key={tick}
                className="absolute right-1 -translate-y-1/2 text-[11px] tabular-nums text-[#94a3b8]"
                style={{
                  top: `${((axis.max - tick) / (axis.max - axis.min)) * 100}%`,
                }}
              >
                {formatYAxis(tick)}
              </span>
            ))}
          </div>
        </div>
        <div
          ref={scrollRef}
          role="region"
          tabIndex={0}
          aria-label="Histórico de cotação com rolagem horizontal"
          onPointerDown={(event) => {
            if (
              !fullscreen ||
              event.pointerType === "touch" ||
              event.pointerType === "pen"
            )
              return;
            dragRef.current = {
              x: event.clientX,
              scrollLeft: event.currentTarget.scrollLeft,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!dragRef.current) return;
            event.currentTarget.scrollLeft =
              dragRef.current.scrollLeft - (event.clientX - dragRef.current.x);
          }}
          onPointerUp={(event) => {
            dragRef.current = null;
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => {
            dragRef.current = null;
          }}
          className={`min-w-0 flex-1 overflow-x-auto overscroll-x-contain pb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-purple ${fullscreen ? "cursor-grab select-none active:cursor-grabbing" : ""}`}
        >
          <div
            className={
              fullscreen
                ? "h-full transition-[min-width] duration-[360ms] motion-reduce:transition-none"
                : `h-[280px] md:h-[260px] transition-[min-width] duration-[360ms] motion-reduce:transition-none ${MOBILE_CHART_WIDTH[period]} sm:min-w-0`
            }
            style={
              fullscreen
                ? { minWidth: `max(100%, ${FULLSCREEN_CHART_WIDTH[period]}px)` }
                : undefined
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 4, left: 0, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.12)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatAxisDate}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(255,255,255,0.16)" }}
                  interval="preserveStartEnd"
                  minTickGap={32}
                  tickMargin={8}
                />
                <YAxis
                  hide
                  width={0}
                  ticks={axis.ticks}
                  domain={[axis.min, axis.max]}
                />
                <RechartsTooltip
                  content={<DualTooltip currency={currency} />}
                />
                <Line
                  type="monotone"
                  dataKey="close"
                  name="Cotação"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: "#38bdf8",
                    stroke: "#0f172a",
                    strokeWidth: 2,
                  }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
                {avgPrice != null && (
                  <Line
                    type="monotone"
                    dataKey="avgPrice"
                    name="Preço médio"
                    stroke="#eab308"
                    strokeWidth={1.5}
                    strokeDasharray="5 4"
                    dot={false}
                    activeDot={{ r: 3, fill: "#eab308" }}
                    isAnimationActive={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      {period !== "1M" && (
        <p className="mt-1 text-xs text-white/45 sm:hidden">
          Deslize o gráfico para ver datas anteriores.
        </p>
      )}
    </div>
  );
}

// ─── AssetPositionResult ──────────────────────────────────────────────────────

interface AssetPositionResultProps {
  valorInvestido: number | null;
  ganhoCapital: number | null;
  proventos12m: number | null;
  rentTotal: number | null;
  vscdipp: number | null;
  currency: AssetCurrency;
}

function AssetPositionResult({
  valorInvestido,
  ganhoCapital,
  proventos12m,
  rentTotal,
  vscdipp,
  currency,
}: AssetPositionResultProps) {
  const rows = [
    {
      label: "Valor investido",
      value:
        valorInvestido != null ? fmtMoney(valorInvestido, currency) : MISSING,
      color: "text-white",
    },
    {
      label: "+ Ganho de capital",
      value: ganhoCapital != null ? fmtMoney(ganhoCapital, currency) : MISSING,
      color:
        ganhoCapital != null && ganhoCapital >= 0
          ? "text-nf-green"
          : "text-nf-pink",
    },
    {
      label: "Proventos recebidos (12M)",
      value: proventos12m != null ? fmtMoney(proventos12m, currency) : MISSING,
      color: "text-nf-green",
    },
    {
      label: "Rentabilidade total",
      value: rentTotal != null ? fmtPct(rentTotal) : MISSING,
      color:
        rentTotal != null && rentTotal >= 0 ? "text-nf-green" : "text-nf-pink",
    },
    {
      label: "vs CDI",
      value:
        vscdipp != null
          ? `${vscdipp >= 0 ? "+" : ""}${vscdipp.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} p.p.`
          : MISSING,
      color: vscdipp != null && vscdipp >= 0 ? "text-nf-green" : "text-nf-pink",
    },
  ];

  return (
    <PanelCard>
      <h3 className="text-sm font-semibold text-white mb-4">
        Resultado da posição
      </h3>
      <div className="space-y-3">
        {rows.map(({ label, value, color }) => (
          <div key={label} className="flex justify-between items-center">
            <span className="text-[13px] text-[#8f8f8f]">{label}</span>
            <span className={`text-sm font-semibold tabular-nums ${color}`}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </PanelCard>
  );
}

// ─── AssetTransactionPreview ──────────────────────────────────────────────────

interface AssetTransactionPreviewProps {
  ticker: string;
  currency: AssetCurrency;
  navigate: (path: string) => void;
}

function AssetTransactionPreview({
  ticker,
  currency,
  navigate,
}: AssetTransactionPreviewProps) {
  const { data: allTxns = [], isLoading } = useAllTransactions();

  const recent = useMemo(
    () =>
      allTxns
        .filter(
          (t) => t.ticker === ticker && (t.type === "buy" || t.type === "sell"),
        )
        .slice(0, 3),
    [allTxns, ticker],
  );

  return (
    <PanelCard>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Lançamentos</h3>
        <button
          type="button"
          onClick={() => navigate("/ativos/lancamentos")}
          className="text-xs text-nf-blue hover:underline"
        >
          Ver todos &gt;
        </button>
      </div>

      {isLoading ? (
        <p className="text-xs text-[#8f8f8f] animate-pulse">Carregando…</p>
      ) : recent.length === 0 ? (
        <p className="text-xs text-[#8f8f8f]">Sem lançamentos registrados.</p>
      ) : (
        <div className="space-y-2">
          {recent.map((txn) => {
            const total = Number(txn.quantity) * Number(txn.price);
            return (
              <div
                key={txn.id}
                className="flex items-center justify-between gap-2"
              >
                <span className="text-[12px] text-[#8f8f8f]">
                  {fmtDate(txn.transaction_date)}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    txn.type === "buy"
                      ? "bg-nf-green/20 text-nf-green"
                      : "bg-nf-pink/20 text-nf-pink"
                  }`}
                >
                  {txn.type === "buy" ? "Compra" : "Venda"}
                </span>
                <span className="text-sm font-semibold text-white tabular-nums">
                  {fmtMoney(total, currency)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </PanelCard>
  );
}

// ─── AssetDividendPreview ─────────────────────────────────────────────────────

interface AssetDividendPreviewProps {
  ticker: string;
  quantity: number;
  currency: AssetCurrency;
  navigate: (path: string) => void;
}

function AssetDividendPreview({
  ticker,
  currency,
  navigate,
}: AssetDividendPreviewProps) {
  const { rows: dividends, isLoading, isError, refetch } = useDividends("Tudo");

  const recent = useMemo(
    () =>
      dividends
        .filter((row) => row.ticker === ticker)
        .sort((a, b) =>
          (b.payment_date ?? "").localeCompare(a.payment_date ?? ""),
        )
        .slice(0, 4),
    [dividends, ticker],
  );

  return (
    <PanelCard>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Proventos</h3>
        <button
          type="button"
          onClick={() => navigate("/desempenho/proventos")}
          className="text-xs text-nf-blue hover:underline"
        >
          Ver todos &gt;
        </button>
      </div>

      {isLoading ? (
        <p className="text-xs text-[#8f8f8f] animate-pulse">Carregando…</p>
      ) : isError ? (
        <div role="alert">
          <p>Não foi possível carregar seus recebimentos.</p>
          <button type="button" onClick={refetch}>
            Tentar novamente
          </button>
        </div>
      ) : recent.length === 0 ? (
        <p className="text-xs text-[#8f8f8f]">
          Sem proventos recebidos nesta carteira.
        </p>
      ) : (
        <div className="space-y-2">
          {recent.map((div, i) => {
            const rowCurrency =
              div.currency === "USD"
                ? "USD"
                : div.currency === "BRL"
                  ? "BRL"
                  : currency;
            return (
              <div
                key={`${div.ex_date}-${i}`}
                className="flex items-center justify-between gap-2"
              >
                <span className="text-[12px] text-[#8f8f8f]">
                  {fmtDate(div.payment_date)}
                </span>
                <span className="text-[12px] text-[#8f8f8f]">
                  {div.source === "imported"
                    ? "Líquido importado"
                    : `${fmtMoney(Number(div.value_per_share), rowCurrency)} × ${div.quantity.toLocaleString("pt-BR")}`}
                </span>
                <span className="text-sm font-semibold text-nf-green tabular-nums">
                  = {fmtMoney(div.total_value, rowCurrency)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </PanelCard>
  );
}

// ─── AssetScoreAlerts ─────────────────────────────────────────────────────────

interface BazinResult {
  hasData: boolean;
  annualDividend?: number | null;
  ceilingPrice?: number | null;
  currentPrice?: number | null;
  margin?: number | null;
}

interface AssetScoreAlertsProps {
  ticker: string;
  bazin: BazinResult | undefined;
  scoreValue: number | null | undefined;
  activeScoreName: string | null;
  navigate: (path: string) => void;
}

function AssetScoreAlerts({
  ticker,
  bazin,
  scoreValue,
  activeScoreName,
  navigate,
}: AssetScoreAlertsProps) {
  const { data: allAlerts = [] } = useAlerts();

  const tickerAlerts = useMemo(
    () => allAlerts.filter((a) => a.ticker === ticker).slice(0, 2),
    [allAlerts, ticker],
  );

  // Bazin rules: hasData, ceilingPrice > currentPrice, margin > 0, annualDividend > 0 = 4 rules max
  const bazinRulesPassed = useMemo(() => {
    if (!bazin || !bazin.hasData) return 0;
    let count = 0;
    if (bazin.hasData) count++;
    if (bazin.annualDividend != null && bazin.annualDividend > 0) count++;
    if (bazin.ceilingPrice != null && bazin.ceilingPrice > 0) count++;
    if (bazin.margin != null && bazin.margin > 0) count++;
    return count;
  }, [bazin]);

  return (
    <PanelCard>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">
          Score &amp; Alertas
        </h3>
        <button
          type="button"
          onClick={() => navigate("/analise/alertas")}
          className="text-xs text-nf-blue hover:underline"
        >
          Ver análise &gt;
        </button>
      </div>

      {/* Score */}
      {activeScoreName && (
        <div className="mb-4">
          <p className="text-xs text-[#8f8f8f] mb-1">{activeScoreName}</p>
          <span
            className={`text-xl font-bold tabular-nums ${
              scoreValue == null
                ? "text-[#8f8f8f]"
                : scoreValue > 0
                  ? "text-nf-green"
                  : scoreValue < 0
                    ? "text-nf-pink"
                    : "text-white"
            }`}
          >
            {scoreValue == null
              ? "N/A"
              : scoreValue > 0
                ? `+${scoreValue}`
                : scoreValue}
          </span>
        </div>
      )}

      {/* Bazin progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-[#8f8f8f]">Regras Bazin</p>
          <p className="text-xs text-white">{bazinRulesPassed}/4</p>
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
          <div
            className="h-full rounded-full bg-nf-blue transition-all"
            style={{ width: `${(bazinRulesPassed / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Alertas */}
      {tickerAlerts.length === 0 ? (
        <p className="text-xs text-[#8f8f8f]">Sem alertas para este ativo.</p>
      ) : (
        <div className="space-y-2">
          {tickerAlerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-start justify-between gap-2"
            >
              <p className="text-[12px] text-white/80 flex-1 truncate">
                {alert.title}
              </p>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium flex-shrink-0 ${
                  alert.status === "novo"
                    ? "bg-nf-blue/20 text-nf-blue"
                    : "bg-white/[0.06] text-[#8f8f8f]"
                }`}
              >
                {alert.status === "novo" ? "Novo" : "Ignorado"}
              </span>
            </div>
          ))}
        </div>
      )}
    </PanelCard>
  );
}

// ─── Tab: Lançamentos ─────────────────────────────────────────────────────────

interface TabLancamentosProps {
  ticker: string;
  currency: AssetCurrency;
  navigate: (path: string) => void;
}

function TabLancamentos({ ticker, currency, navigate }: TabLancamentosProps) {
  const { data: allTxns = [], isLoading } = useAllTransactions();

  const txns = useMemo(
    () => allTxns.filter((t) => t.ticker === ticker),
    [allTxns, ticker],
  );

  return (
    <PanelCard>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">
          Todos os Lançamentos — {ticker}
        </h3>
        <button
          type="button"
          onClick={() => navigate("/ativos/lancamentos")}
          className="text-xs text-nf-blue hover:underline"
        >
          Ver na tela completa &gt;
        </button>
      </div>
      {isLoading ? (
        <p className="text-sm text-[#8f8f8f] animate-pulse">Carregando…</p>
      ) : txns.length === 0 ? (
        <p className="text-sm text-[#8f8f8f]">Sem lançamentos registrados.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-[#8f8f8f]">
                  Data
                </th>
                <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-[#8f8f8f]">
                  Tipo
                </th>
                <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-[#8f8f8f]">
                  Qtd
                </th>
                <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-[#8f8f8f]">
                  Preço
                </th>
                <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-[#8f8f8f]">
                  Total
                </th>
                <th className="pb-2 pl-3 text-right text-xs font-semibold uppercase tracking-wide text-[#8f8f8f]">
                  Opções
                </th>
              </tr>
            </thead>
            <tbody>
              {txns.map((txn) => (
                <tr
                  key={txn.id}
                  className="border-b border-white/[0.04] last:border-0"
                >
                  <td className="py-2 text-[#8f8f8f]">
                    {fmtDate(txn.transaction_date)}
                  </td>
                  <td className="py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        txn.type === "buy"
                          ? "bg-nf-green/20 text-nf-green"
                          : "bg-nf-pink/20 text-nf-pink"
                      }`}
                    >
                      {txn.type === "buy"
                        ? "Compra"
                        : txn.type === "sell"
                          ? "Venda"
                          : txn.type}
                    </span>
                  </td>
                  <td className="py-2 text-right text-white tabular-nums">
                    {Number(txn.quantity).toLocaleString("pt-BR")}
                  </td>
                  <td className="py-2 text-right text-white tabular-nums">
                    {fmtMoney(Number(txn.price), currency)}
                  </td>
                  <td className="py-2 text-right text-white tabular-nums font-medium">
                    {fmtMoney(
                      Number(txn.quantity) * Number(txn.price),
                      currency,
                    )}
                  </td>
                  <td className="py-2 pl-3 text-right">
                    <EditTransactionButton transaction={txn} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PanelCard>
  );
}

// ─── Tab: Proventos ───────────────────────────────────────────────────────────

interface TabProventosProps {
  ticker: string;
  quantity: number;
  currency: AssetCurrency;
}

function TabProventos({ ticker, currency }: TabProventosProps) {
  const {
    data: dividends = [],
    isLoading,
    isError,
    refetch,
  } = useAssetDividends(ticker);
  const received = useDividends("Tudo");
  const [view, setView] = useState<"received" | "market">("received");
  const payments = received.rows.filter((row) => row.ticker === ticker);

  return (
    <PanelCard>
      <h3 className="text-sm font-semibold text-white mb-4">
        Proventos — {ticker}
      </h3>
      <div
        className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-white/[0.03] p-1 md:flex"
        role="tablist"
        aria-label="Origem dos proventos"
      >
        <button
          type="button"
          role="tab"
          aria-selected={view === "received"}
          className={`min-h-11 rounded-lg px-3 py-2 text-sm leading-snug ${view === "received" ? "bg-white/10 text-white" : "text-white/70 hover:text-white"}`}
          onClick={() => setView("received")}
        >
          Recebidos na carteira
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "market"}
          className={`min-h-11 rounded-lg px-3 py-2 text-sm leading-snug ${view === "market" ? "bg-white/10 text-white" : "text-white/70 hover:text-white"}`}
          onClick={() => setView("market")}
        >
          Histórico do ativo
        </button>
      </div>
      {view === "received" ? (
        received.isLoading ? (
          <p>Carregando recebimentos…</p>
        ) : received.isError ? (
          <div role="alert">
            <p>Não foi possível carregar seus recebimentos.</p>
            <button type="button" onClick={received.refetch}>
              Tentar novamente
            </button>
          </div>
        ) : payments.length === 0 ? (
          <p>Sem proventos recebidos nesta carteira.</p>
        ) : (
          <div className="md:overflow-x-auto">
            <table className="block w-full text-sm md:table">
              <thead className="sr-only md:not-sr-only md:table-header-group">
                <tr>
                  <th className="pb-3 pr-4 text-left text-white/70">
                    Pagamento
                  </th>
                  <th className="pb-3 pr-4 text-left text-white/70">Tipo</th>
                  <th className="pb-3 pr-4 text-right text-white/70">
                    Quantidade histórica
                  </th>
                  <th className="pb-3 text-right text-white/70">
                    Total recebido
                  </th>
                </tr>
              </thead>
              <tbody className="grid gap-3 md:table-row-group">
                {payments.map((row, index) => (
                  <tr
                    key={`${row.payment_date}-${index}`}
                    className="grid grid-cols-2 gap-x-4 gap-y-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 md:table-row md:rounded-none md:border-0 md:border-b md:border-white/[0.04] md:bg-transparent md:p-0"
                  >
                    <td className="block md:table-cell md:whitespace-nowrap md:py-3 md:pr-4">
                      <span
                        aria-hidden="true"
                        className="mb-1 block text-xs text-white/60 md:hidden"
                      >
                        Pagamento
                      </span>
                      <span className="tabular-nums">
                        {fmtDate(row.payment_date)}
                      </span>
                    </td>
                    <td className="block min-w-0 md:table-cell md:py-3 md:pr-4">
                      <span
                        aria-hidden="true"
                        className="mb-1 block text-xs text-white/60 md:hidden"
                      >
                        Tipo
                      </span>
                      <span className="block break-words">
                        {(
                          {
                            dividend: "Dividendo",
                            jcp: "JCP",
                            interest: "Juros",
                            distribution: "Rendimento",
                          } as Record<string, string>
                        )[row.type] ?? row.type}
                      </span>
                      <span className="mt-1 block text-xs text-white/60">
                        {row.source === "imported"
                          ? "Líquido importado"
                          : "Estimado"}
                      </span>
                    </td>
                    <td className="block md:table-cell md:py-3 md:pr-4 md:text-right">
                      <span
                        aria-hidden="true"
                        className="mb-1 block text-xs text-white/60 md:hidden"
                      >
                        Quantidade histórica
                      </span>
                      <span className="tabular-nums">
                        {row.quantity.toLocaleString("pt-BR")}
                      </span>
                    </td>
                    <td className="block md:table-cell md:py-3 md:text-right">
                      <span
                        aria-hidden="true"
                        className="mb-1 block text-xs text-white/60 md:hidden"
                      >
                        Total recebido
                      </span>
                      <span className="text-base font-semibold tabular-nums md:text-sm">
                        {fmtMoney(
                          row.total_value,
                          row.currency === "BRL"
                            ? "BRL"
                            : row.currency === "USD"
                              ? "USD"
                              : currency,
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : isLoading ? (
        <p className="text-sm text-[#8f8f8f] animate-pulse">Carregando…</p>
      ) : isError ? (
        <div>
          <p className="text-sm text-nf-pink mb-2">
            Erro ao carregar proventos.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-sm underline text-nf-pink/80"
          >
            Tentar novamente
          </button>
        </div>
      ) : dividends.length === 0 ? (
        <p className="text-sm text-[#8f8f8f]">Sem histórico de proventos.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-[#8f8f8f]">
                  Data ex
                </th>
                <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-[#8f8f8f]">
                  Tipo
                </th>
                <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-[#8f8f8f]">
                  Por cota
                </th>
              </tr>
            </thead>
            <tbody>
              {dividends.map((d, i) => (
                <tr
                  key={`${d.ticker}-${d.ex_date}-${i}`}
                  className="border-b border-white/[0.04] last:border-0"
                >
                  <td className="py-2 text-[#8f8f8f]">{fmtDate(d.ex_date)}</td>
                  <td className="py-2 text-[#8f8f8f] uppercase text-xs">
                    {d.type}
                  </td>
                  <td className="py-2 text-right text-white tabular-nums">
                    {fmtMoney(Number(d.value_per_share), currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PanelCard>
  );
}

// ─── Tab: Rentabilidade ───────────────────────────────────────────────────────

interface TabRentabilidadeProps {
  ticker: string;
  priceHistory: PricePoint[];
  avgPrice: number | null;
  currency: AssetCurrency;
  period: PriceHistoryPeriod;
  chartPeriod: PriceHistoryPeriod;
  onPeriodChange: (p: PriceHistoryPeriod) => void;
  onExpandChart: () => void;
  valorInvestido: number | null;
  ganhoCapital: number | null;
  proventos12m: number | null;
  rentTotal: number | null;
  vscdipp: number | null;
}

function TabRentabilidade({
  ticker,
  priceHistory,
  avgPrice,
  currency,
  period,
  chartPeriod,
  onPeriodChange,
  onExpandChart,
  valorInvestido,
  ganhoCapital,
  proventos12m,
  rentTotal,
  vscdipp,
}: TabRentabilidadeProps) {
  return (
    <div className="space-y-4">
      <PanelCard padding="p-4 md:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold text-white">
            Cotação e preço médio
          </h3>
          <div className="flex items-center gap-2">
            <PeriodSelector
              value={period}
              onChange={onPeriodChange}
              periods={PRICE_PERIODS}
              fullWidthOnMobile
            />
            <button
              type="button"
              onClick={onExpandChart}
              aria-label="Expandir gráfico de cotação"
              title="Expandir gráfico"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-purple"
            >
              <Maximize2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        {priceHistory.length > 0 ? (
          <ChartErrorBoundary>
            <PriceLineChartWithAvg
              ticker={ticker}
              data={priceHistory}
              avgPrice={avgPrice}
              currency={currency}
              period={chartPeriod}
            />
          </ChartErrorBoundary>
        ) : (
          <div className="flex h-[260px] items-center justify-center rounded-lg border border-dashed border-white/[0.08]">
            <p className="text-sm text-[#8f8f8f]">
              Sem histórico para o período selecionado.
            </p>
          </div>
        )}
      </PanelCard>
      <AssetPositionResult
        valorInvestido={valorInvestido}
        ganhoCapital={ganhoCapital}
        proventos12m={proventos12m}
        rentTotal={rentTotal}
        vscdipp={vscdipp}
        currency={currency}
      />
    </div>
  );
}

// ─── Tab: Score ───────────────────────────────────────────────────────────────

interface TabScoreProps {
  ticker: string;
  activeScoreName: string | null;
  scoreValue: number | null | undefined;
  bazin: BazinResult | undefined;
  currency: AssetCurrency;
}

function TabScore({ activeScoreName, scoreValue, bazin }: TabScoreProps) {
  return (
    <div className="space-y-4">
      {activeScoreName && (
        <PanelCard>
          <h3 className="text-sm font-semibold text-white mb-3">
            Score Fundamentalista
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#8f8f8f]">Score:</span>
            <span className="font-medium text-white">{activeScoreName}</span>
            <span
              className={`text-2xl font-bold tabular-nums ${
                scoreValue == null
                  ? "text-[#8f8f8f]"
                  : scoreValue > 0
                    ? "text-nf-green"
                    : scoreValue < 0
                      ? "text-nf-pink"
                      : "text-white"
              }`}
            >
              {scoreValue == null
                ? "N/A"
                : scoreValue > 0
                  ? `+${scoreValue}`
                  : scoreValue}
            </span>
          </div>
        </PanelCard>
      )}

      <PanelCard>
        <h3 className="text-sm font-semibold text-white mb-3">
          Preço-Teto Bazin (DY 6%)
        </h3>
        {bazin ? (
          bazin.hasData ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-[#8f8f8f] mb-1">Dividendo 12M</p>
                <p className="font-semibold text-white tabular-nums">
                  {fmtMoney(bazin.annualDividend ?? null, "BRL")}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#8f8f8f] mb-1">Preço-Teto</p>
                <p className="font-semibold text-white tabular-nums">
                  {fmtMoney(bazin.ceilingPrice ?? null, "BRL")}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#8f8f8f] mb-1">Cotação</p>
                <p className="font-semibold text-white tabular-nums">
                  {fmtMoney(bazin.currentPrice ?? null, "BRL")}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#8f8f8f] mb-1">Margem</p>
                <p
                  className={`font-semibold tabular-nums ${
                    bazin.margin == null
                      ? "text-[#8f8f8f]"
                      : bazin.margin > 0
                        ? "text-nf-green"
                        : "text-nf-pink"
                  }`}
                >
                  {bazin.margin != null ? fmtPct(bazin.margin) : MISSING}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#8f8f8f]">
              Sem histórico de dividendos nos últimos 12 meses para calcular o
              preço-teto.
            </p>
          )
        ) : (
          <p className="text-sm text-[#8f8f8f] animate-pulse">Calculando…</p>
        )}
      </PanelCard>
    </div>
  );
}

// ─── Tab: Alertas ─────────────────────────────────────────────────────────────

interface TabAlertasProps {
  ticker: string;
}

function TabAlertas({ ticker }: TabAlertasProps) {
  const { data: allAlerts = [], isLoading } = useAlerts();

  const tickerAlerts = useMemo(
    () => allAlerts.filter((a) => a.ticker === ticker),
    [allAlerts, ticker],
  );

  return (
    <PanelCard>
      <h3 className="text-sm font-semibold text-white mb-4">
        Alertas — {ticker}
      </h3>
      {isLoading ? (
        <p className="text-sm text-[#8f8f8f] animate-pulse">Carregando…</p>
      ) : tickerAlerts.length === 0 ? (
        <p className="text-sm text-[#8f8f8f]">Sem alertas para este ativo.</p>
      ) : (
        <div className="space-y-3">
          {tickerAlerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-start justify-between gap-3 border-b border-white/[0.06] pb-3 last:border-0 last:pb-0"
            >
              <div className="flex-1">
                <p className="text-sm text-white">{alert.title}</p>
                <p className="text-xs text-[#8f8f8f] mt-0.5">
                  {alert.description}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium flex-shrink-0 ${
                  alert.status === "novo"
                    ? "bg-nf-blue/20 text-nf-blue"
                    : alert.status === "ignorado"
                      ? "bg-white/[0.06] text-[#8f8f8f]"
                      : "bg-white/[0.06] text-white/60"
                }`}
              >
                {alert.status === "novo"
                  ? "Novo"
                  : alert.status === "ignorado"
                    ? "Ignorado"
                    : "Lido"}
              </span>
            </div>
          ))}
        </div>
      )}
    </PanelCard>
  );
}

// ─── Visão Geral ──────────────────────────────────────────────────────────────

interface VisaoGeralProps {
  ticker: string;
  quantity: number;
  avgPrice: number | null;
  currentPrice: number | null;
  currency: AssetCurrency;
  priceHistory: PricePoint[];
  period: PriceHistoryPeriod;
  chartPeriod: PriceHistoryPeriod;
  onPeriodChange: (p: PriceHistoryPeriod) => void;
  onExpandChart: () => void;
  portfolioWeight: number | null;
  dy: number | null;
  changeVsAvg: number | null;
  valorInvestido: number | null;
  ganhoCapital: number | null;
  proventos12m: number | null;
  rentTotal: number | null;
  vscdipp: number | null;
  bazin: BazinResult | undefined;
  scoreValue: number | null | undefined;
  activeScoreName: string | null;
  navigate: (path: string) => void;
}

function VisaoGeral({
  ticker,
  quantity,
  avgPrice,
  currentPrice,
  currency,
  priceHistory,
  period,
  chartPeriod,
  onPeriodChange,
  onExpandChart,
  portfolioWeight,
  dy,
  changeVsAvg,
  valorInvestido,
  ganhoCapital,
  proventos12m,
  rentTotal,
  vscdipp,
  bazin,
  scoreValue,
  activeScoreName,
  navigate,
}: VisaoGeralProps) {
  const balance = currentPrice != null ? currentPrice * quantity : null;

  return (
    <div className="space-y-4">
      {/* KPI Grid */}
      <AssetKpiGrid
        quantity={quantity}
        avgPrice={avgPrice}
        balance={balance}
        portfolioWeight={portfolioWeight}
        changeVsAvg={changeVsAvg}
        dy={dy}
        currency={currency}
      />

      {/* Gráfico + Resultado — desktop: 2 colunas; mobile: stack */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        {/* Gráfico */}
        <PanelCard padding="p-4 md:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold text-white">
              Cotação e preço médio
            </h3>
            <div className="flex items-center gap-2">
              <PeriodSelector
                value={period}
                onChange={onPeriodChange}
                periods={PRICE_PERIODS}
                fullWidthOnMobile
              />
              <button
                type="button"
                onClick={onExpandChart}
                aria-label="Expandir gráfico de cotação"
                title="Expandir gráfico"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-purple"
              >
                <Maximize2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          {priceHistory.length > 0 ? (
            <ChartErrorBoundary>
              <PriceLineChartWithAvg
                ticker={ticker}
                data={priceHistory}
                avgPrice={avgPrice}
                currency={currency}
                period={chartPeriod}
              />
            </ChartErrorBoundary>
          ) : (
            <div className="flex h-[260px] items-center justify-center rounded-lg border border-dashed border-white/[0.08]">
              <p className="text-sm text-[#8f8f8f]">
                Sem histórico para o período selecionado.
              </p>
            </div>
          )}
        </PanelCard>

        {/* Resultado da posição */}
        <AssetPositionResult
          valorInvestido={valorInvestido}
          ganhoCapital={ganhoCapital}
          proventos12m={proventos12m}
          rentTotal={rentTotal}
          vscdipp={vscdipp}
          currency={currency}
        />
      </div>

      {/* Bottom section — desktop: 3 colunas; mobile: stack */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AssetTransactionPreview
          ticker={ticker}
          currency={currency}
          navigate={navigate}
        />
        <AssetDividendPreview
          ticker={ticker}
          quantity={quantity}
          currency={currency}
          navigate={navigate}
        />
        <AssetScoreAlerts
          ticker={ticker}
          bazin={bazin}
          scoreValue={scoreValue}
          activeScoreName={activeScoreName}
          navigate={navigate}
        />
      </div>
    </div>
  );
}

function FullscreenAssetSearch({
  onSelect,
}: {
  onSelect: (ticker: string, query: string) => void;
}) {
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(term.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [term]);
  const { data = [], isFetching } = useAssetSearch(debounced);
  const select = (ticker: string) => {
    onSelect(ticker, term.trim());
    setTerm("");
  };
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (debounced === term.trim() && data[0]) select(data[0].ticker);
      }}
      className="relative min-w-0 flex-1 md:max-w-sm"
    >
      <label className="sr-only" htmlFor="fullscreen-asset-search">
        Buscar outro ativo
      </label>
      <div className="flex h-11 items-center gap-2 rounded-full border border-white/15 bg-[#242424] px-3 focus-within:border-nf-purple">
        <Search className="h-4 w-4 shrink-0 text-white/55" aria-hidden="true" />
        <input
          id="fullscreen-asset-search"
          type="search"
          autoComplete="off"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Buscar outro ativo"
          className="min-w-0 flex-1 bg-transparent text-base text-white placeholder:text-white/45 focus:outline-none"
        />
      </div>
      {term.trim().length >= 2 && (
        <div className="absolute inset-x-0 top-full z-10 mt-2 max-h-[40dvh] overflow-y-auto rounded-2xl border border-white/15 bg-[#242424] p-2 shadow-2xl">
          {isFetching || debounced !== term.trim() ? (
            <p role="status" className="p-3 text-sm text-white/55">
              Buscando ativos…
            </p>
          ) : data.length ? (
            <ul aria-label="Sugestões de ativos">
              {data.map((asset) => (
                <li key={asset.ticker}>
                  <button
                    type="button"
                    onClick={() => select(asset.ticker)}
                    className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-3 text-left hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-purple"
                  >
                    <span className="font-semibold text-white">
                      {asset.ticker}
                    </span>
                    <span className="truncate text-sm text-white/55">
                      {asset.name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-3 text-sm text-white/55">
              Nenhum ativo encontrado.
            </p>
          )}
        </div>
      )}
    </form>
  );
}

function ExpandedPriceChart({
  ticker,
  name,
  data,
  avgPrice,
  currency,
  period,
  chartPeriod,
  loading = false,
  onPeriodChange,
  onClose,
  onAlert,
  onSelectAsset,
}: {
  ticker: string;
  name: string;
  data: PricePoint[];
  avgPrice: number | null;
  currency: AssetCurrency;
  period: PriceHistoryPeriod;
  chartPeriod: PriceHistoryPeriod;
  loading?: boolean;
  onPeriodChange: (period: PriceHistoryPeriod) => void;
  onClose: () => void;
  onAlert: () => void;
  onSelectAsset: (ticker: string, query: string) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Gráfico de cotação em tela cheia: ${ticker}`}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
        if (event.key !== "Tab") return;
        const items = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            "button:not([disabled]), input:not([disabled])",
          ),
        );
        if (!items.length) return;
        if (event.shiftKey && document.activeElement === items[0]) {
          event.preventDefault();
          items[items.length - 1].focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === items[items.length - 1]
        ) {
          event.preventDefault();
          items[0].focus();
        }
      }}
      className="asset-chart-fullscreen fixed inset-0 z-[45] flex h-dvh min-h-0 flex-col bg-[#131313] text-white"
    >
      <header className="shrink-0 space-y-3 border-b border-white/10 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] md:px-8">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">
              {ticker}{" "}
              <span className="font-normal text-white/55">· {name}</span>
            </h2>
            <p className="text-xs text-white/45">Cotação e preço médio</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Sair da tela cheia"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-white/75 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-purple"
          >
            <Minimize2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FullscreenAssetSearch onSelect={onSelectAsset} />
          <FavoriteButton ticker={ticker} />
          <button
            type="button"
            onClick={onAlert}
            disabled={loading}
            className="min-h-11 rounded-full border border-white/15 px-4 text-sm text-white/85 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-purple disabled:opacity-40"
          >
            Criar alerta
          </button>
        </div>
        <PeriodSelector
          value={period}
          onChange={onPeriodChange}
          periods={PRICE_PERIODS}
          fullWidthOnMobile
        />
      </header>
      <div className="min-h-0 flex-1 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:p-6">
        <div className="h-full min-h-0 rounded-2xl border border-white/10 bg-[#1B1B1B] p-4 md:p-6">
          {loading ? (
            <div
              role="status"
              className="grid h-full place-items-center text-sm text-white/50"
            >
              Carregando gráfico…
            </div>
          ) : data.length ? (
            <ChartErrorBoundary>
              <PriceLineChartWithAvg
                ticker={ticker}
                data={data}
                avgPrice={avgPrice}
                currency={currency}
                period={chartPeriod}
                fullscreen
              />
            </ChartErrorBoundary>
          ) : (
            <div className="grid h-full place-items-center text-sm text-white/50">
              Sem histórico para o período selecionado.
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export function AtivoDetailPage({
  embedded = false,
}: { embedded?: boolean } = {}) {
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const location = useLocation();
  const [chartExpanded, setChartExpanded] = useState(() =>
    Boolean(
      (location.state as { chartExpanded?: boolean } | null)?.chartExpanded,
    ),
  );
  useEffect(() => {
    if ((location.state as { chartExpanded?: boolean } | null)?.chartExpanded)
      setChartExpanded(true);
  }, [location.key, location.state]);
  const { ticker: rawTicker = "" } = useParams<{ ticker: string }>();
  const navigate = useNavigate();
  const goBack = () => navigate(-1);
  const ticker = rawTicker.toUpperCase();
  const selectAssetInFullscreen = (nextTicker: string, query: string) => {
    if (nextTicker.toUpperCase() === ticker) return;
    const path = embedded
      ? `/ativos/explorar/${encodeURIComponent(nextTicker)}?q=${encodeURIComponent(query)}`
      : `/ativo/${encodeURIComponent(nextTicker)}`;
    navigate(path, { state: { chartExpanded: true } });
  };

  const [activeTab, setActiveTab] = useState<AtivoTab>("visao-geral");
  const [period, setPeriod] = useState<PriceHistoryPeriod>("1A");

  // ── Dados do ativo ──────────────────────────────────────────────────────────
  const { data: asset, isLoading: assetLoading } = useAssetDetail(ticker);
  const priceHistoryQuery = usePriceHistory(ticker, period);
  const { data: priceHistory, period: chartPeriod, retained: retainingPriceHistory } =
    useRetainedChartData(ticker, period, priceHistoryQuery.data ?? [], Boolean(priceHistoryQuery.isLoading));
  const { selectedWallet } = useWallets();
  const valuation = useAtivosValuation(selectedWallet?.id ?? "", true);
  const positions = valuation.positions;
  const quotesQuery = useLatestQuotes([ticker]);
  const { data: fundamentalsList = [], isLoading: fundamentalsLoading, isError: fundamentalsError } = useFundamentals([ticker]);

  // ── Score ───────────────────────────────────────────────────────────────────
  const { data: allRules = [] } = useScoreRules();
  const { data: preferences } = useScorePreferences();
  const activeRuleId = preferences?.default_score_rule_id ?? null;

  const activeScoreName = useMemo(() => {
    if (!activeRuleId) return null;
    return allRules.find((r) => r.id === activeRuleId)?.name ?? null;
  }, [allRules, activeRuleId]);

  const activeRules = useMemo(() => {
    if (!activeScoreName) return [];
    return allRules.filter((r) => r.name === activeScoreName);
  }, [allRules, activeScoreName]);

  const scoreByTicker = useCalculateScore(activeRules, fundamentalsList);
  const scoreValue = activeScoreName
    ? (scoreByTicker.get(ticker) ?? null)
    : undefined;

  // ── Bazin ───────────────────────────────────────────────────────────────────
  const bazinCurrencyMap = useMemo(
    () => new Map([[ticker, (asset?.currency ?? "BRL") as AssetCurrency]]),
    [ticker, asset?.currency],
  );
  const { bazinByTicker } = useBazin([ticker], 0.06, bazinCurrencyMap);
  const bazin = bazinByTicker.get(ticker);

  // ── Cotação e posição ───────────────────────────────────────────────────────
  const quote = useMemo(
    () => (quotesQuery.data ?? []).find((q) => q.ticker === ticker) ?? null,
    [quotesQuery.data, ticker],
  );

  const myPosition = useMemo(
    () => positions.find((p) => p.ticker === ticker) ?? null,
    [positions, ticker],
  );

  const fundamental = fundamentalsList[0] ?? null;
  const dailyChangePct = useDailyChange(quote);

  // ── Cor da classe do ativo ──────────────────────────────────────────────────
  const assetType = asset?.type ?? null;
  const color = assetType ? assetClassColor(assetType) : "#8f8f8f";

  // Variação da posição sobre o custo de compra.
  // Ganho sobre o custo pertence à posição; o cabeçalho usa o fechamento anterior.
  const currentPrice = quote ? Number(quote.close) : null;
  const avgPrice = myPosition ? Number(myPosition.average_price) : null;
  const quantity = myPosition ? Number(myPosition.quantity) : 0;

  const changeVsAvg =
    avgPrice != null && currentPrice != null && avgPrice > 0
      ? ((currentPrice - avgPrice) / avgPrice) * 100
      : null;

  // ── Peso na carteira ────────────────────────────────────────────────────────
  const portfolioWeight =
    valuation.isLoading || valuation.isError
      ? null
      : (valuation.rows.find((row) => row.ticker === ticker)?.weightPercent ??
        null);

  // ── Resultado da posição ────────────────────────────────────────────────────
  const valorInvestido =
    avgPrice != null && quantity > 0 ? avgPrice * quantity : null;
  const ganhoCapital =
    currentPrice != null && valorInvestido != null
      ? currentPrice * quantity - valorInvestido
      : null;

  // Proventos 12M via useDividendTotals
  const quantityByTickerMap = useMemo(() => {
    const m = new Map<string, number>();
    if (myPosition) m.set(ticker, quantity);
    return m;
  }, [myPosition, ticker, quantity]);
  const dividendCurrencyMap = useMemo(() => new Map([[ticker, asset?.currency ?? 'BRL']]), [ticker, asset?.currency]);
  const dividendTotalsMap = useDividendTotals([ticker], quantityByTickerMap, dividendCurrencyMap);
  const proventos12m = dividendTotalsMap.has(ticker) ? dividendTotalsMap.get(ticker)! : 0;

  // Rentabilidade vs CDI
  const { summary: perfSummary } = usePerformance("1A");
  const cdiReturnPct = perfSummary.cdiReturnPct;

  const rentTotal =
    ganhoCapital != null && proventos12m != null && valorInvestido != null && valorInvestido > 0
      ? ((ganhoCapital + proventos12m) / valorInvestido) * 100
      : null;
  const vscdipp =
    rentTotal != null && cdiReturnPct != null
      ? rentTotal - cdiReturnPct * 100
      : null;

  // ── Dividend Yield ──────────────────────────────────────────────────────────
  const dy = fundamental?.dy ?? null;

  // ── Estado: loading do ativo ────────────────────────────────────────────────
  if (assetLoading) {
    return (
      <div className="p-8">
        <p className="text-[#8f8f8f] animate-pulse">Carregando ativo…</p>
        {chartExpanded && (
          <ExpandedPriceChart
            ticker={ticker}
            name="Carregando ativo"
            data={[]}
            avgPrice={null}
            currency="BRL"
            period={period}
            chartPeriod={period}
            loading
            onPeriodChange={setPeriod}
            onClose={() => setChartExpanded(false)}
            onAlert={() => {}}
            onSelectAsset={selectAssetInFullscreen}
          />
        )}
      </div>
    );
  }

  // ── Ativo não encontrado ────────────────────────────────────────────────────
  if (!asset) {
    return (
      <div className="p-8">
        <PanelCard>
          <div className="p-10 text-center">
            <p className="text-lg font-medium text-white/80 mb-2">
              Ativo não encontrado no catálogo
            </p>
            <p className="text-sm text-[#8f8f8f] mb-6">
              O ticker <span className="font-mono text-white">{ticker}</span>{" "}
              não está no catálogo de ativos da plataforma.
            </p>
            {!embedded && (
              <button
                type="button"
                onClick={goBack}
                className="rounded-lg border border-white/[0.08] px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
              >
                ← Voltar
              </button>
            )}
          </div>
        </PanelCard>
      </div>
    );
  }

  const currency = (asset.currency ?? "BRL") as AssetCurrency;
  const assetTypeLabel = asset.type ? assetClassLabel(asset.type) : asset.type;

  return (
    <div
      className={`${embedded ? "p-0" : "p-4 md:p-8"} max-w-7xl mx-auto space-y-4 md:space-y-6`}
    >
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <AssetDetailHero
        ticker={asset.ticker}
        name={asset.name}
        type={assetTypeLabel}
        color={color}
        currentPrice={currentPrice}
        dailyChangePct={dailyChangePct}
        currency={currency}
        onBack={goBack}
        showBreadcrumb={!embedded}
        onTransaction={() => setTransactionOpen(true)}
        onAlert={() => setAlertOpen(true)}
      />
      <AddTransactionModal
        isOpen={transactionOpen}
        onClose={() => setTransactionOpen(false)}
        ticker={asset.ticker}
        assetType={asset.type}
        assetName={asset.name}
      />
      <Modal
        isOpen={alertOpen}
        onClose={() => setAlertOpen(false)}
        title="Criar alerta"
      >
        {alertOpen && (
          <PriceAlertForm
            key={ticker}
            initialTicker={asset.ticker}
            onClose={() => {
              setAlertOpen(false);
              if (!chartExpanded) setActiveTab("alertas");
            }}
          />
        )}
      </Modal>
      {chartExpanded && (
        <ExpandedPriceChart
          ticker={asset.ticker}
          name={asset.name}
          data={priceHistory}
          avgPrice={avgPrice}
          currency={currency}
          period={period}
          chartPeriod={chartPeriod}
          loading={Boolean(priceHistoryQuery.isLoading) && !retainingPriceHistory}
          onPeriodChange={setPeriod}
          onClose={() => setChartExpanded(false)}
          onAlert={() => setAlertOpen(true)}
          onSelectAsset={selectAssetInFullscreen}
        />
      )}

      {/* ── Sub-tabs ─────────────────────────────────────────────────────── */}
      <InternalSubTabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* ── Conteúdo da tab ─────────────────────────────────────────────── */}
      {activeTab === "visao-geral" && (
        <>
        <FundamentalsPanel row={fundamental} type={asset.type} loading={fundamentalsLoading} error={fundamentalsError} />
        <VisaoGeral
          ticker={ticker}
          quantity={quantity}
          avgPrice={avgPrice}
          currentPrice={currentPrice}
          currency={currency}
          priceHistory={priceHistory}
          period={period}
          chartPeriod={chartPeriod}
          onPeriodChange={setPeriod}
          onExpandChart={() => setChartExpanded(true)}
          portfolioWeight={portfolioWeight}
          dy={dy}
          changeVsAvg={changeVsAvg}
          valorInvestido={valorInvestido}
          ganhoCapital={ganhoCapital}
          proventos12m={proventos12m}
          rentTotal={rentTotal}
          vscdipp={vscdipp}
          bazin={bazin}
          scoreValue={scoreValue}
          activeScoreName={activeScoreName}
          navigate={navigate}
        />
        </>
      )}

      {activeTab === "lancamentos" && (
        <TabLancamentos
          ticker={ticker}
          currency={currency}
          navigate={navigate}
        />
      )}

      {activeTab === "proventos" && (
        <TabProventos ticker={ticker} quantity={quantity} currency={currency} />
      )}

      {activeTab === "rentabilidade" && (
        <TabRentabilidade
          ticker={ticker}
          priceHistory={priceHistory}
          avgPrice={avgPrice}
          currency={currency}
          period={period}
          chartPeriod={chartPeriod}
          onPeriodChange={setPeriod}
          onExpandChart={() => setChartExpanded(true)}
          valorInvestido={valorInvestido}
          ganhoCapital={ganhoCapital}
          proventos12m={proventos12m}
          rentTotal={rentTotal}
          vscdipp={vscdipp}
        />
      )}

      {activeTab === "score" && (
        <>
        <TabScore
          ticker={ticker}
          activeScoreName={activeScoreName}
          scoreValue={scoreValue}
          bazin={bazin}
          currency={currency}
        />
        <PanelCard><ScoreBreakdown rules={activeRules} row={fundamental} /></PanelCard>
        </>
      )}

      {activeTab === "alertas" && <TabAlertas ticker={ticker} />}
    </div>
  );
}
