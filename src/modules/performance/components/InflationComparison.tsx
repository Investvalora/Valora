import { LoadingState } from '../../../shared/components/LoadingState'
import { lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { benchmarkService } from "../services/benchmarkService";
import { inflationComparison } from "../utils/inflationComparison";
import { toIsoDate } from "../../../shared/utils/isoDate";
import type { PerformanceSeries } from "../types";

const Chart = lazy(() => import("./PerformanceLineChart"));

export function InflationComparison({
  portfolio,
  scrollOnMobile = false,
}: {
  portfolio: PerformanceSeries;
  scrollOnMobile?: boolean;
}) {
  const since = portfolio.points[0]?.date ?? "";
  const query = useQuery({
    queryKey: ["benchmarks", "ipca-monthly", since],
    queryFn: () => benchmarkService.listMonthlyInflation(since),
    enabled: Boolean(since),
    staleTime: 3600000,
    retry: 1,
  });
  const today = toIsoDate(new Date());
  const series = useMemo(
    () => inflationComparison(portfolio, query.data ?? [], today),
    [portfolio, query.data, today],
  );
  const hasData = series[0].points.length > 1;
  return (
    <section
      aria-label="Comparação com a inflação"
      className={
        scrollOnMobile
          ? "min-w-0 md:rounded-2xl md:border md:border-white/[0.08] md:bg-[#1B1B1B] md:p-6"
          : "rounded-2xl border border-white/[0.08] bg-[#1B1B1B] p-4 md:p-6"
      }
    >
      <h3
        className={`mb-2 font-semibold text-white ${scrollOnMobile ? "text-lg tracking-tight md:text-sm md:tracking-normal" : "text-sm"}`}
      >
        Carteira × IPCA — meses completos publicados
      </h3>
      <p className="mb-4 text-xs text-white/50">
        Carteira e inflação partem do mesmo fechamento mensal. O mês inicial
        parcial é excluído; a comparação termina no último mês consecutivo com
        IPCA publicado e histórico da carteira completo. Não há estimativa
        diária nem cálculo de rentabilidade real.
      </p>
      {query.isLoading ? (
        <LoadingState label="Carregando IPCA…" />
      ) : query.isError ? (
        <p role="alert" className="text-sm text-white/60">
          Não foi possível carregar o IPCA.{" "}
          <button
            type="button"
            className="underline"
            onClick={() => void query.refetch()}
          >
            Tentar novamente
          </button>
        </p>
      ) : hasData ? (
        <Suspense
          fallback={
            <LoadingState label="Carregando gráfico…" variant="chart" />
          }
        >
          <Chart series={series} scrollOnMobile={scrollOnMobile} />
        </Suspense>
      ) : (
        <p role="status" className="text-sm text-white/60">
          Não há meses completos publicados em comum com o histórico disponível
          da carteira. O mês ainda não divulgado permanece indisponível.
        </p>
      )}
      <p className="mt-3 text-xs text-white/40">
        Fonte:{" "}
        <a
          className="underline"
          href="https://www3.bcb.gov.br/sgspub/consultarvalores/consultarValoresSeries.do?method=consultarSeries&series=433"
          target="_blank"
          rel="noreferrer"
        >
          Banco Central, SGS 433 — IPCA mensal
        </a>
        .
      </p>
    </section>
  );
}
