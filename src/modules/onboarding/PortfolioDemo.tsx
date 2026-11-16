import { useEffect, useState } from "react";
import {
  Bar,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtMoney, fmtPct } from "../ativos/utils/fmt";

const months = [
  { month: "Mai", portfolio: 1.2, cdi: 1.0, income: 32 },
  { month: "Jun", portfolio: 2.5, cdi: 2.1, income: 43 },
  { month: "Jul", portfolio: 2.0, cdi: 3.1, income: 37 },
  { month: "Ago", portfolio: 5.1, cdi: 4.1, income: 51 },
  { month: "Set", portfolio: 7.7, cdi: 5.2, income: 62 },
  { month: "Out", portfolio: 10.4, cdi: 6.2, income: 58 },
];
const last = months[months.length - 1];
const income = months.reduce((total, point) => total + point.income, 0);
const tooltipStyle = {
  background: "#202026",
  borderColor: "#3f3f46",
  borderRadius: 12,
};
const axisStyle = { fill: "#a1a1aa", fontSize: 11 };

export function PortfolioDemo() {
  const [view, setView] = useState<"returns" | "income">("returns");
  const [displayedView, setDisplayedView] = useState(view);
  const [blurring, setBlurring] = useState(false);
  const returns = displayedView === "returns";

  useEffect(() => {
    if (
      view === displayedView ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setDisplayedView(view);
      setBlurring(false);
      return;
    }
    setBlurring(true);
    const timer = window.setTimeout(() => setDisplayedView(view), 160);
    return () => window.clearTimeout(timer);
  }, [view, displayedView]);
  return (
    <div className="space-y-4">
      <p className="max-w-xl text-sm text-white/70">
        Veja como o Valora apresenta o desempenho de uma carteira. Os valores
        abaixo são fictícios.
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="group"
          aria-label="Visão da carteira de exemplo"
          className="flex flex-wrap gap-2"
        >
          <button
            type="button"
            aria-pressed={view === "returns"}
            onClick={() => setView("returns")}
            className="min-h-10 rounded-xl border border-white/15 px-4 text-sm font-medium text-white/75 aria-pressed:border-[#5cc8ff]/40 aria-pressed:bg-[#3f7dff]/15 aria-pressed:text-white"
          >
            Rentabilidade
          </button>
          <button
            type="button"
            aria-pressed={view === "income"}
            onClick={() => setView("income")}
            className="min-h-10 rounded-xl border border-white/15 px-4 text-sm font-medium text-white/75 aria-pressed:border-[#5cc8ff]/40 aria-pressed:bg-[#3f7dff]/15 aria-pressed:text-white"
          >
            Proventos
          </button>
        </div>
        <span className="rounded-full bg-[#3f7dff]/10 px-3 py-1 text-xs font-medium text-[#5cc8ff]">
          Demonstração
        </span>
      </div>
      <section
        aria-label={
          returns ? "Rentabilidade comparada ao CDI" : "Proventos mensais"
        }
        className="first-access-reveal rounded-2xl border border-white/10 bg-black/15 p-3 sm:p-4"
      >
        {returns ? (
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <span className="text-[#5cc8ff]">
              Carteira {fmtPct(last.portfolio)}
            </span>
            <span className="text-white/75">CDI {fmtPct(last.cdi)}</span>
          </div>
        ) : (
          <p className="text-sm text-white/75">
            Total em seis meses{" "}
            <strong className="ml-1 text-nf-green">
              {fmtMoney(income, "BRL")}
            </strong>
          </p>
        )}
        <div
          data-blurred={blurring}
          className="first-access-chart-switch mt-3 h-[clamp(8rem,30dvh,17rem)] min-w-0"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={months}
              margin={{ top: 8, right: 14, bottom: 0, left: 10 }}
              accessibilityLayer
            >
              <XAxis dataKey="month" tick={axisStyle} />
              <YAxis hide domain={[0, "auto"]} />
              <Tooltip
                formatter={(value, name) => [
                  returns
                    ? fmtPct(Number(value))
                    : fmtMoney(Number(value), "BRL"),
                  name,
                ]}
                contentStyle={tooltipStyle}
              />
              <Line
                hide={!returns}
                type="monotone"
                name="Carteira"
                dataKey="portfolio"
                stroke="#5cc8ff"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                hide={!returns}
                type="monotone"
                name="CDI"
                dataKey="cdi"
                stroke="#a1a1aa"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={false}
              />
              <Bar
                hide={returns}
                name="Proventos"
                dataKey="income"
                fill="#63d16b"
                radius={[5, 5, 0, 0]}
                maxBarSize={36}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs font-light uppercase tracking-wide tabular-nums text-white/65">
        <span>Patrimônio: {fmtMoney(12840, "BRL")}</span>
        <span>· exemplo</span>
      </p>
    </div>
  );
}
