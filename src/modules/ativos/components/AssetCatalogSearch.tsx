import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { useAssetSearch } from "../../portfolio/hooks/useAssetSearch";
import { assetClassLabel } from "../../portfolio/composition";

export function AssetCatalogSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [term, setTerm] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestionsVisible, setSuggestionsVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const focusOnOpen = useRef(false);
  const userEdited = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();
  const lastPathname = useRef(location.pathname);
  const normalized = term.trim();

  useEffect(() => {
    if (lastPathname.current !== location.pathname) userEdited.current = false;
    lastPathname.current = location.pathname;
  }, [location.pathname]);
  useEffect(() => {
    if (location.pathname.startsWith("/ativos/explorar")) {
      if (userEdited.current) return;
      setTerm(new URLSearchParams(location.search).get("q") ?? "");
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(normalized), 300);
    return () => clearTimeout(timer);
  }, [normalized]);
  useEffect(() => {
    if (open && focusOnOpen.current) {
      inputRef.current?.focus();
      focusOnOpen.current = false;
    }
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        if (location.pathname.startsWith("/ativos/explorar"))
          setSuggestionsVisible(false);
        else onOpenChange(false);
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open, onOpenChange, location.pathname]);
  useEffect(() => {
    if (
      !userEdited.current ||
      !open ||
      !location.pathname.startsWith("/ativos/explorar") ||
      normalized !== searchTerm
    )
      return;
    userEdited.current = false;
    const current = new URLSearchParams(location.search).get("q") ?? "";
    if (searchTerm === current) return;
    navigate(
      searchTerm
        ? `/ativos/explorar?q=${encodeURIComponent(searchTerm)}`
        : "/ativos/explorar",
      { replace: true },
    );
  }, [
    open,
    location.pathname,
    location.search,
    normalized,
    searchTerm,
    navigate,
  ]);

  const {
    data = [],
    isFetching,
    isError,
    refetch,
  } = useAssetSearch(searchTerm);
  const waiting = normalized !== searchTerm || isFetching;
  const goToResults = () => {
    if (normalized.length < 2) return;
    userEdited.current = false;
    setSuggestionsVisible(false);
    navigate(`/ativos/explorar?q=${encodeURIComponent(normalized)}`);
  };

  return (
    <div
      ref={containerRef}
      className={`relative h-11 min-w-0 shrink-0 transition-[width] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${open ? "w-full md:w-[min(24rem,40vw)]" : "w-36"}`}
    >
      <form
        aria-hidden={!open}
        onSubmit={(event) => {
          event.preventDefault();
          goToResults();
        }}
        className={`absolute inset-0 flex min-h-11 items-center gap-2 rounded-full border border-nf-purple bg-[#242424] px-3 transition-[opacity,filter,transform] duration-300 ease-out focus-within:ring-2 focus-within:ring-nf-purple/40 motion-reduce:transition-none ${open ? "opacity-100 blur-none scale-100" : "pointer-events-none opacity-0 blur-sm scale-[0.98]"}`}
      >
        <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-white/55" />
        <input
          ref={inputRef}
          type="search"
          value={term}
          autoComplete="off"
          tabIndex={open ? 0 : -1}
          aria-label="Buscar ativo por nome ou ticker"
          aria-controls="asset-search-suggestions"
          onChange={(event) => {
            userEdited.current = true;
            setTerm(event.target.value);
            setSuggestionsVisible(true);
          }}
          onClick={() => setSuggestionsVisible(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              userEdited.current = false;
              setSuggestionsVisible(false);
              onOpenChange(false);
              event.stopPropagation();
            }
          }}
          placeholder="Nome ou ticker do ativo"
          className="min-w-0 flex-1 bg-transparent text-base text-white placeholder:text-white/45 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          onClick={() => {
            setSuggestionsVisible(false);
            onOpenChange(false);
          }}
          aria-label="Fechar busca"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </form>
      {open && suggestionsVisible && normalized.length >= 2 && (
        <div
          id="asset-search-suggestions"
          className="absolute left-0 right-0 top-full z-40 mt-2 max-h-[min(24rem,55dvh)] overflow-y-auto rounded-2xl border border-white/15 bg-[#242424] p-2 shadow-2xl"
          aria-live="polite"
        >
          {waiting ? (
            <p role="status" className="p-3 text-sm text-white/60">
              Buscando ativos…
            </p>
          ) : isError ? (
            <div role="alert" className="p-3 text-sm text-nf-pink">
              Não foi possível buscar os ativos.{" "}
              <button
                type="button"
                onClick={() => refetch()}
                className="underline"
              >
                Tentar novamente
              </button>
            </div>
          ) : data.length === 0 ? (
            <p className="p-3 text-sm text-white/60">
              Nenhum ativo encontrado. Tente outro nome ou ticker.
            </p>
          ) : (
            <ul aria-label="Sugestões de ativos">
              {data.map((asset) => (
                <li key={asset.ticker}>
                  <Link
                    to={`/ativos/explorar/${encodeURIComponent(asset.ticker)}?q=${encodeURIComponent(normalized)}`}
                    onClick={() => {
                      userEdited.current = false;
                      setSuggestionsVisible(false);
                    }}
                    className="flex min-h-14 items-center justify-between gap-3 rounded-xl px-3 py-2 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-purple"
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold text-white">
                        {asset.ticker}
                      </span>
                      <span className="block truncate text-sm text-white/65">
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
          )}
          <button
            type="button"
            onClick={goToResults}
            className="mt-1 min-h-11 w-full rounded-xl border-t border-white/10 px-3 text-left text-sm font-medium text-nf-blue hover:bg-white/[0.06]"
          >
            Ver resultados para “{normalized}”
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => {
          focusOnOpen.current = true;
          onOpenChange(true);
        }}
        aria-label="Buscar ativo no catálogo"
        aria-hidden={open}
        tabIndex={open ? -1 : 0}
        className={`absolute inset-0 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 text-sm font-medium text-white/85 transition-[opacity,filter,transform,background-color] duration-300 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-purple motion-reduce:transition-none ${open ? "pointer-events-none scale-95 opacity-0 blur-sm" : "scale-100 opacity-100 blur-none"}`}
      >
        <Search aria-hidden="true" className="h-4 w-4" />
        <span>Buscar ativo</span>
      </button>
    </div>
  );
}
