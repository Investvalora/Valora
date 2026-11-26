import { InformationHelp } from '../../../shared/components/InformationHelp'
import { LoadingState } from '../../../shared/components/LoadingState'
import { useState } from "react";
import { Check, Plus, Search, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useAssetSearch } from "../../portfolio/hooks/useAssetSearch";
import type { Asset } from "../../portfolio/types";
import { useFundamentals } from "../../score/hooks/useFundamentals";
import {
  INDICATOR_CATALOG,
  INDICATOR_IDS,
  supportsIndicator,
} from "../../../shared/indicators/catalog";

const indicatorCell =
  "sticky left-0 z-10 border-r border-white/10 bg-[#121212] px-2 py-3 text-center md:px-4 md:text-left";
const assetCell =
  "border-r border-white/10 px-2 py-3 text-center last:border-r-0 md:px-4 md:text-left";
const sampleIndicators = [
  { label: "P/L", values: ["8,4×", "12,1×"] },
  { label: "P/VP", values: ["1,3×", "1,8×"] },
  { label: "ROE", values: ["15,2%", "12,6%"] },
  { label: "Dividend Yield", values: ["5,6%", "3,1%"] },
];

function ComparisonExample() {
  return (
    <div className="space-y-2" aria-label="Exemplo de comparação">
      <table
        aria-describedby="comparison-example-note"
        className="w-full table-fixed border-separate border-spacing-0 text-left text-xs text-white/80 sm:text-sm [&_tbody_td]:border-t [&_tbody_td]:border-white/10 [&_tbody_th]:border-t [&_tbody_th]:border-white/10"
      >
        <thead>
          <tr>
            <th scope="col" className={indicatorCell}>
              Indicador
            </th>
            <th scope="col" className={assetCell}>
              Empresa Horizonte
            </th>
            <th scope="col" className={assetCell}>
              Empresa Aurora
            </th>
          </tr>
        </thead>
        <tbody>
          {sampleIndicators.map(({ label, values }) => (
            <tr key={label}>
              <th scope="row" className={`${indicatorCell} font-medium`}>
                {label}
              </th>
              {values.map((value, index) => (
                <td key={index} className={`${assetCell} tabular-nums`}>
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p
        id="comparison-example-note"
        className="px-2 pt-1 text-xs font-light uppercase tracking-wide text-white/65"
      >
        Demonstração · Empresas e indicadores fictícios.
      </p>
    </div>
  );
}

export function AssetComparison({
  initialAsset,
  embedded = false,
}: { initialAsset?: Asset; embedded?: boolean } = {}) {
  const [term, setTerm] = useState("");
  const [selected, setSelected] = useState<Asset[]>(() =>
    initialAsset ? [initialAsset] : [],
  );
  const search = useAssetSearch(term);
  const funds = useFundamentals(selected.map((asset) => asset.ticker));
  const atLimit = selected.length >= 4;

  return (
    <section className="min-w-0 space-y-5">
      <header>
        {!embedded && (
          <h2 className="text-lg font-semibold text-white">Comparar ativos <InformationHelp topic="analysis" /></h2>
        )}
        <p className="mt-2 text-sm text-white/60">
          {initialAsset
            ? `Busque um segundo ativo para comparar com ${initialAsset.ticker}. Você pode incluir até quatro ativos, mesmo fora da carteira.`
            : "Selecione de dois a quatro ativos do catálogo, mesmo que não estejam na sua carteira. Compare indicadores considerando setor, período e fonte."}
        </p>
      </header>

      <div>
        <label className="text-sm text-white/80" htmlFor="comparison-search">
          Buscar por ticker ou nome
        </label>
        <div className="relative mt-2">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45"
          />
          <input
            id="comparison-search"
            type="search"
            value={term}
            disabled={atLimit}
            onChange={(event) => setTerm(event.target.value)}
            className="w-full rounded-lg border border-white/15 bg-white/5 py-2.5 pl-10 pr-3 text-base text-white placeholder:text-white/40 focus:border-white/45 focus:outline-none disabled:opacity-50 md:text-sm"
            placeholder="Ex.: Petrobras ou PETR4"
          />
        </div>
        {atLimit && (
          <p className="mt-2 text-xs text-white/60">
            Limite de quatro ativos. Remova um para escolher outro.
          </p>
        )}

        {term.trim().length >= 2 && !atLimit && (
          <div className="mt-2">
            {search.isFetching && (
              <LoadingState label="Buscando…" />
            )}
            {search.isError && (
              <p role="alert" className="py-2 text-sm text-amber-200">
                Não foi possível buscar.{" "}
                <button
                  type="button"
                  onClick={() => search.refetch()}
                  className="underline"
                >
                  Tentar novamente
                </button>
              </p>
            )}
            {!search.isFetching &&
              !search.isError &&
              search.data?.length === 0 && (
                <p className="py-2 text-sm text-white/60">
                  Nenhum ativo encontrado no catálogo.
                </p>
              )}
            {!!search.data?.length && (
              <ul
                aria-label="Resultados da busca"
                className="divide-y divide-white/10 border-y border-white/10"
              >
                {search.data.map((asset) => {
                  const alreadySelected = selected.some(
                    (item) => item.ticker === asset.ticker,
                  );
                  return (
                    <li key={asset.ticker}>
                      <button
                        type="button"
                        aria-label={`${asset.ticker} · ${asset.name} · ${asset.currency}`}
                        disabled={alreadySelected}
                        onClick={() => {
                          setSelected((items) => [...items, asset]);
                          setTerm("");
                        }}
                        className="flex min-h-12 w-full items-center justify-between gap-3 px-2 py-2 text-left hover:bg-white/5 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-1px] focus-visible:outline-white/50 disabled:opacity-50"
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-white">
                            {asset.ticker}
                          </span>
                          <span className="block break-words text-xs text-white/65">
                            {asset.name} · {asset.currency}
                          </span>
                        </span>
                        {alreadySelected ? (
                          <Check
                            aria-hidden="true"
                            className="h-4 w-4 shrink-0 text-white/60"
                          />
                        ) : (
                          <Plus
                            aria-hidden="true"
                            className="h-4 w-4 shrink-0 text-white/60"
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {selected.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {selected.map((asset) =>
              asset.ticker === initialAsset?.ticker ? (
                <span
                  key={asset.ticker}
                  className="inline-flex min-h-8 items-center rounded-full border border-nf-blue/30 bg-nf-blue/10 px-3 text-xs font-semibold text-white"
                >
                  {asset.ticker}
                </span>
              ) : (
                <button
                  key={asset.ticker}
                  type="button"
                  onClick={() =>
                    setSelected((items) =>
                      items.filter((item) => item.ticker !== asset.ticker),
                    )
                  }
                  aria-label={`Remover ${asset.ticker}`}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-white/15 px-3 text-xs font-medium text-white hover:bg-white/10"
                >
                  {asset.ticker}
                  <X aria-hidden="true" className="h-3 w-3 text-white/60" />
                </button>
              ),
            )}
          </div>
        )}
      </div>

      {selected.length < 2 ? (
        embedded ? (
          <ComparisonExample />
        ) : (
          <p className="text-sm text-white/60">
            Escolha pelo menos dois ativos para iniciar a comparação.
          </p>
        )
      ) : funds.isLoading ? (
        <LoadingState label="Carregando indicadores…" />
      ) : funds.isError ? (
        <p role="alert" className="text-sm text-amber-200">
          Não foi possível carregar os indicadores.{" "}
          <button
            type="button"
            onClick={() => funds.refetch()}
            className="underline"
          >
            Tentar novamente
          </button>
        </p>
      ) : (
        <div className="space-y-3">
          <p
            id="comparison-data-note"
            className="text-xs leading-relaxed text-white/60"
          >
            Dados mais recentes disponíveis por ativo. Ausência de dados não
            significa zero; múltiplos e percentuais têm unidades distintas.
          </p>
          <div
            className="-mx-2 overflow-x-auto overscroll-x-contain md:mx-0"
            role="region"
            aria-label="Comparação com rolagem horizontal"
            tabIndex={0}
          >
            <table
              aria-describedby="comparison-data-note"
              className="w-full table-fixed border-separate border-spacing-0 break-words text-xs text-white/80 md:text-sm [&_tbody_td]:border-t [&_tbody_td]:border-white/10 [&_tbody_th]:border-t [&_tbody_th]:border-white/10"
              style={{ minWidth: `${6 + selected.length * 6.5}rem` }}
            >
              <colgroup>
                <col className="w-24 md:w-40" />
                <col span={selected.length} />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col" className={indicatorCell}>
                    Indicador
                  </th>
                  {selected.map((asset) => (
                    <th
                      key={asset.ticker}
                      scope="col"
                      className={`${assetCell} align-top`}
                    >
                      {embedded ? (
                        <span className="text-[#5cc8ff]">{asset.ticker}</span>
                      ) : (
                        <Link
                          className="text-nf-blue hover:underline"
                          to={`/ativo/${asset.ticker.toLowerCase()}`}
                        >
                          {asset.ticker}
                        </Link>
                      )}
                      <p className="mt-1 text-xs font-normal text-white/60">
                        {asset.name} · {asset.currency}
                      </p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {INDICATOR_IDS.map((metric) => (
                  <tr key={metric}>
                    <th scope="row" className={`${indicatorCell} font-medium`}>
                      {metric === "debt_equity"
                        ? "Dívida/PL (%)"
                        : INDICATOR_CATALOG[metric].label}
                    </th>
                    {selected.map((asset) => {
                      const row = funds.data?.find(
                        (item) => item.ticker === asset.ticker,
                      );
                      const value = row?.[metric];
                      const available =
                        row &&
                        !["seed", "synthetic"].includes(row.source ?? "") &&
                        (metric !== "debt_equity" || row.source === "yahoo") &&
                        typeof value === "number" &&
                        Number.isFinite(value);
                      return (
                        <td
                          key={asset.ticker}
                          className={`${assetCell} tabular-nums`}
                        >
                          {!supportsIndicator(metric, asset.type)
                            ? "Não se aplica"
                            : available
                              ? `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}${INDICATOR_CATALOG[metric].unit === "percent" ? "%" : "×"}`
                              : "Indisponível"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr>
                  <th scope="row" className={indicatorCell}>
                    Referência e fonte
                  </th>
                  {selected.map((asset) => {
                    const row = funds.data?.find(
                      (item) => item.ticker === asset.ticker,
                    );
                    return (
                      <td
                        key={asset.ticker}
                        className={`${assetCell} text-xs text-white/60`}
                      >
                        {row &&
                        !["seed", "synthetic"].includes(row.source ?? "")
                          ? `${row.reference_date ? row.reference_date.split('-').reverse().join('/') : 'Referência não informada'} · ${row.source ?? "Fonte não informada"}`
                          : "Sem dados reais disponíveis"}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
