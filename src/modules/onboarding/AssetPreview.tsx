import { useId } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  usePriceHistory,
  type PriceHistoryPeriod,
} from "../assets/hooks/usePriceHistory";
import { canMorphPrices, morphPrices } from "../assets/priceChartMorph";
import { useChartMorph } from "../../shared/hooks/useChartMorph";
import { useRetainedChartData } from "../../shared/hooks/useRetainedChartData";
import type { PricePoint } from "../assets/types";
import { useLatestQuotes } from "../portfolio/hooks/useLatestQuotes";
import { assetClassLabel } from "../portfolio/composition";
import type { Asset } from "../portfolio/types";
import { fmtMoney } from "../ativos/utils/fmt";

const periods = ["1M", "3M", "1A"] as const;
const emptyHistory: PricePoint[] = [];
const examplePrices = [
  27.8, 28.5, 28.1, 29.3, 30.2, 28.9, 29.6, 31.3, 30.7, 32.1, 31.8, 33.1, 32.6,
  34.2, 33.7, 34.9, 34.4, 35.6, 35.0, 36.2, 35.4, 36.7, 35.8, 37.2,
];
const exampleHistory: PricePoint[] = examplePrices.map((close, index) => ({
  date: new Date(Date.UTC(2025, Math.floor(index / 2), index % 2 ? 25 : 10))
    .toISOString()
    .slice(0, 10),
  close,
}));
const exampleByPeriod: Partial<Record<PriceHistoryPeriod, PricePoint[]>> = {
  "1M": exampleHistory.slice(-3),
  "3M": exampleHistory.slice(-7),
  "1A": exampleHistory,
};

function shortDate(value: string) {
  return value.slice(5).split("-").reverse().join("/");
}

const axisPrice = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumSignificantDigits: 4,
});
const smallAxisPrice = new Intl.NumberFormat("pt-BR", {
  notation: "scientific",
  maximumFractionDigits: 2,
});

function formatAxisPrice(value: number) {
  return (
    value !== 0 && Math.abs(value) < 0.001 ? smallAxisPrice : axisPrice
  ).format(value);
}

export function AssetPreview({
  asset,
  period,
  onPeriodChange,
}: {
  asset?: Asset;
  period: PriceHistoryPeriod;
  onPeriodChange: (value: PriceHistoryPeriod) => void;
}) {
  const chartTipId = useId();
  const scope = asset?.ticker ?? "onboarding-example";
  const history = usePriceHistory(asset?.ticker ?? "", period);
  const historyData = asset
    ? (history.data ?? emptyHistory)
    : (exampleByPeriod[period] ?? exampleHistory);
  const { data, retained } = useRetainedChartData(
    scope,
    period,
    historyData,
    Boolean(asset && history.isLoading),
  );
  const animate =
    typeof window.matchMedia === "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const chartData = useChartMorph(
    scope,
    data,
    morphPrices,
    canMorphPrices,
    animate,
  );
  const quotes = useLatestQuotes(asset ? [asset.ticker] : []);
  const latest = quotes.data?.find((quote) => quote.ticker === asset?.ticker);
  const currency = asset?.currency ?? "BRL";
  const hasChart = chartData.some((point) => point.close !== null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-white">
            {asset?.ticker ?? "Ativo de exemplo"}
          </h2>
          <p className="text-sm text-white/65 [overflow-wrap:anywhere]">
            {asset
              ? asset.name || assetClassLabel(asset.type)
              : "Série de preços fictícia"}
          </p>
        </div>
        {latest && (
          <div>
            <p className="text-xs text-white/60">Último fechamento</p>
            <p className="text-lg font-semibold tabular-nums">
              {fmtMoney(Number(latest.close), currency)}
            </p>
          </div>
        )}
      </div>

      <section
        aria-label="Histórico de preços"
        aria-describedby={chartTipId}
        className="border-t border-white/10 pt-3"
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            Histórico de preços{" "}
            <span className="text-xs font-normal text-white/65">
              {currency}
            </span>
          </h3>
          <div
            className="flex gap-1"
            role="group"
            aria-label="Período do gráfico"
          >
            {periods.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={period === option}
                onClick={() => onPeriodChange(option)}
                className="min-h-9 rounded-lg px-2.5 text-xs text-white/70 hover:bg-white/10 aria-pressed:bg-[#3f7dff]/20 aria-pressed:text-white"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <div
          data-reveal="3"
          className="first-access-reveal h-[clamp(9rem,35dvh,22rem)] min-w-0"
        >
          {asset && history.isLoading && !retained ? (
            <p role="status" className="py-10 text-sm text-white/65">
              Carregando histórico…
            </p>
          ) : asset && history.isError ? (
            <button
              type="button"
              onClick={() => void history.refetch()}
              className="min-h-11 text-sm text-[#5cc8ff] underline"
            >
              Tentar carregar o gráfico novamente
            </button>
          ) : hasChart ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
                accessibilityLayer
              >
                <CartesianGrid vertical={false} stroke="#ffffff16" />
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDate}
                  minTickGap={28}
                  tick={{ fill: "#a1a1aa", fontSize: 11 }}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  width={64}
                  tickCount={5}
                  tickFormatter={formatAxisPrice}
                  tickMargin={8}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#a1a1aa", fontSize: 11 }}
                />
                <Tooltip
                  labelFormatter={shortDate}
                  formatter={(value) => [
                    fmtMoney(Number(value), currency),
                    "Fechamento",
                  ]}
                  contentStyle={{
                    background: "#202026",
                    borderColor: "#3f3f46",
                    borderRadius: 12,
                  }}
                />
                <Line
                  name="Fechamento"
                  type="monotone"
                  dataKey="close"
                  stroke="#5cc8ff"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-10 text-sm text-white/65">
              Sem histórico disponível neste período.
            </p>
          )}
        </div>
      </section>
      <p id={chartTipId} className="text-sm text-white/65">
        Veja como o preço mudou. Use o histórico como referência para definir o
        preço que você quer acompanhar.
      </p>
    </div>
  );
}
