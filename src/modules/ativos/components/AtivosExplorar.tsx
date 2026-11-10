import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { assetClassLabel } from "../../portfolio/composition";
import { positionService } from "../../portfolio/services/positionService";
import { AtivoDetailPage } from "../../assets/components/AtivoDetailPage";
import { useAssetDetail } from "../../assets/hooks/useAssetDetail";
import { useAuth } from "../../auth/hooks/useAuth";
import {
  selectExploreEntry,
  useExploreMemory,
} from "../hooks/useExploreMemory";

const PAGE_SIZE = 24;

export function AtivosExplorar() {
  const { user } = useAuth();
  const userId = user?.id ?? "guest";
  const entries = useExploreMemory((state) => state.entries);
  const rememberAsset = useExploreMemory((state) => state.rememberAsset);
  const recentAssets = selectExploreEntry(entries, userId).recentAssets;
  const { ticker: selectedTicker } = useParams<{ ticker: string }>();
  const [params, setParams] = useSearchParams();
  const query = (params.get("q") ?? "").trim();
  const page = Math.max(0, Number.parseInt(params.get("page") ?? "0", 10) || 0);
  const { data: selectedAsset } = useAssetDetail(selectedTicker ?? "");

  useEffect(() => {
    if (selectedAsset)
      rememberAsset(userId, {
        ticker: selectedAsset.ticker,
        name: selectedAsset.name,
        type: selectedAsset.type,
        currency: selectedAsset.currency,
      });
  }, [selectedAsset, rememberAsset, userId]);

  const {
    data = [],
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["assets", "explore", query.toUpperCase(), page],
    queryFn: () => positionService.searchAssetsPage(query, page, PAGE_SIZE),
    enabled: !selectedTicker && query.length >= 2,
  });
  const results = data.slice(0, PAGE_SIZE);
  const setPage = (nextPage: number) => {
    const next = new URLSearchParams(params);
    if (nextPage) next.set("page", String(nextPage));
    else next.delete("page");
    setParams(next);
  };

  return (
    <section
      className="mx-auto max-w-7xl space-y-5"
      aria-label="Explorar ativos"
    >
      {!selectedTicker && (
        <div>
          <h2 id="explore-title" className="text-xl font-semibold text-white">
            Explorar ativos
          </h2>
          <p className="mt-1 text-sm text-white/60">
            Encontre ativos do catálogo, mesmo fora da sua carteira.
          </p>
        </div>
      )}
      {selectedTicker ? (
        <AtivoDetailPage embedded />
      ) : query.length < 2 ? (
        <div className="space-y-4">
          <p className="text-sm text-white/60">
            Use “Buscar ativo” acima para pesquisar por nome ou ticker.
          </p>
          {recentAssets.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white/80">
                Vistos recentemente
              </h3>
              <ul
                aria-label="Ativos vistos recentemente"
                className="grid gap-3 sm:grid-cols-2"
              >
                {recentAssets.map((asset) => (
                  <li key={asset.ticker}>
                    <Link
                      to={`/ativos/explorar/${encodeURIComponent(asset.ticker)}?q=${encodeURIComponent(asset.ticker)}`}
                      className="flex min-h-16 items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-purple"
                    >
                      <span className="min-w-0">
                        <span className="block font-semibold text-white">
                          {asset.ticker}
                        </span>
                        <span className="block truncate text-sm text-white/60">
                          {asset.name}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-white/45">
                        {assetClassLabel(asset.type)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : isFetching ? (
        <p role="status" className="text-sm text-white/60">
          Buscando ativos…
        </p>
      ) : isError ? (
        <div role="alert" className="text-sm text-nf-pink">
          Não foi possível buscar os ativos.{" "}
          <button type="button" onClick={() => refetch()} className="underline">
            Tentar novamente
          </button>
        </div>
      ) : results.length === 0 ? (
        <p className="text-sm text-white/60">
          Nenhum ativo encontrado. Confira o nome ou ticker e tente novamente.
        </p>
      ) : (
        <>
          <p className="text-sm text-white/55">Resultados para “{query}”</p>
          <ul
            aria-label="Resultados do catálogo"
            className="grid gap-3 sm:grid-cols-2"
          >
            {results.map((asset) => (
              <li key={asset.ticker}>
                <Link
                  to={`/ativos/explorar/${encodeURIComponent(asset.ticker)}?${params.toString()}`}
                  className="flex min-h-20 items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-purple"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold text-white">
                      {asset.ticker}
                    </span>
                    <span className="block break-words text-sm text-white/65">
                      {asset.name}
                    </span>
                    <span className="mt-1 block text-xs text-white/45">
                      {assetClassLabel(asset.type)} · {asset.currency}
                    </span>
                  </span>
                  <span aria-hidden="true" className="text-white/40">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-3 text-sm">
            <button
              type="button"
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
              className="min-h-11 rounded-lg px-3 text-nf-blue disabled:opacity-30"
            >
              Anterior
            </button>
            <span className="text-white/55">Página {page + 1}</span>
            <button
              type="button"
              onClick={() => setPage(page + 1)}
              disabled={data.length <= PAGE_SIZE}
              className="min-h-11 rounded-lg px-3 text-nf-blue disabled:opacity-30"
            >
              Próxima
            </button>
          </div>
        </>
      )}
    </section>
  );
}
