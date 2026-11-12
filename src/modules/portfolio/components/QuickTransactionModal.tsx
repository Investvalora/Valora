import { useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChartNoAxesCombined,
  Minus,
  Plus,
  Search,
} from "lucide-react";
import { z } from "zod";
import { useAuth } from "../../auth/hooks/useAuth";
import {
  draftKey,
  readDeviceDraft as readDraft,
  saveDeviceDraft as saveDraft,
  removeDeviceDraft as removeDraft,
} from "../../../shared/utils/sessionDraft";
import { movementDateSchema } from "../schemas/movementDateSchema";
import { assetTransactionDraftSchema } from "../schemas/assetTransactionDraftSchema";
import { toIsoDate } from "../../../shared/utils/isoDate";
import { useQuery } from "@tanstack/react-query";
import { Modal } from "../../../shared/components/Modal";
import { useAddTransaction } from "../hooks/useTransactions";
import { useAddFixedIncomePosition } from "../hooks/useFixedIncomePositions";
import { useCalcFixedIncome } from "../hooks/useCalcFixedIncome";
import { usePositions } from "../hooks/usePositions";
import { useWallets } from "../hooks/useWallets";
import { positionService } from "../services/positionService";
import { useAssetSearch, useTickerLatestPrice } from "../hooks/useAssetSearch";
import { useLookupExternalAsset } from "../hooks/useLookupExternalAsset";
import { useLatestQuotes } from "../hooks/useLatestQuotes";
import { useDailyChange } from "../../assets/hooks/useDailyChange";
import { fmtPct } from "../../ativos/utils/fmt";
import { FIXED_INCOME_TYPE_INDEXER, FIXED_INCOME_RATE_LABEL } from "../types";
import type {
  Asset,
  AssetType,
  FixedIncomeType,
  NewFixedIncomePosition,
} from "../types";

interface QuickTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAsset?: Asset;
  initialTicker?: string;
  initialFixedIncome?: { name: string; type: FixedIncomeType; rate: number };
}

type FormCategory = AssetType | "tesouro_direto";
const transactionDraftSchema = z.object({
  assetClass: z.enum([
    "",
    "stock_br",
    "fii",
    "bdr",
    "stock_us",
    "etf_us",
    "etf_br",
    "reit",
    "crypto",
    "fixed_income",
    "tesouro_direto",
  ]),
  type: z.enum(["buy", "sell"]),
  values: z.record(z.string(), z.string().max(200)),
});

function readTransactionDraft(key: string | null, legacyKey: string | null, asset?: Asset): z.infer<typeof transactionDraftSchema> | null {
  const draft = transactionDraftSchema.safeParse(key ? readDraft(key) : null);
  if (draft.success) return draft.data;

  if (!legacyKey || !asset) return null;
  const legacy = assetTransactionDraftSchema.safeParse(readDraft(legacyKey));
  if (!legacy.success) return null;
  return {
    assetClass: asset.type,
    type: legacy.data.type,
    values: {
      ticker: asset.ticker,
      date: legacy.data.transaction_date,
      quantity: legacy.data.quantity,
      price: legacy.data.price,
      otherCosts: legacy.data.brokerage_fee,
    },
  };
}

const ASSET_TYPES: [AssetType, string][] = [
  ["stock_br", "Ações BR"],
  ["fii", "FIIs"],
  ["bdr", "BDRs"],
  ["stock_us", "Stocks US"],
  ["etf_us", "ETFs US"],
  ["etf_br", "ETFs BR"],
  ["reit", "REITs"],
  ["crypto", "Criptomoedas"],
];

function QuantityField({
  id,
  value,
  onChange,
  step = 1,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  step?: number;
}) {
  const quantity = Number(value.replace(",", ".")) || 0;
  const adjust = (direction: number) => {
    onChange(
      String(
        Math.max(0, Number((quantity + step * direction).toPrecision(15))),
      ),
    );
  };
  const buttonClass =
    "grid size-11 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400 disabled:opacity-35";

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-sm text-white/75">
        Quantidade
      </label>
      <div className="flex h-12 items-center rounded-xl border border-white/10 bg-[#222] p-px">
        <button
          type="button"
          aria-label="Diminuir quantidade"
          className={buttonClass}
          disabled={quantity <= 0}
          onClick={() => adjust(-1)}
        >
          <Minus size={19} aria-hidden="true" />
        </button>
        <input
          id={id}
          type="number"
          step="any"
          min={0}
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="0"
          className="transaction-quantity min-w-0 flex-1 appearance-none rounded-lg bg-transparent px-1 py-2 text-center text-base font-semibold tabular-nums text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
        />
        <button
          type="button"
          aria-label="Aumentar quantidade"
          className={buttonClass}
          onClick={() => adjust(1)}
        >
          <Plus size={19} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}

type TesouroDiretoAtivo =
  | "tesouro_selic"
  | "tesouro_ipca"
  | "tesouro_pre"
  | "tesouro_ipca_juros"
  | "tesouro_pre_juros";

const TD_NAME: Record<TesouroDiretoAtivo, string> = {
  tesouro_selic: "Tesouro Selic",
  tesouro_ipca: "Tesouro IPCA+",
  tesouro_pre: "Tesouro Prefixado",
  tesouro_ipca_juros: "Tesouro IPCA+ com Juros Semestrais",
  tesouro_pre_juros: "Tesouro Prefixado com Juros Semestrais",
};

const TD_DB_TYPE: Record<TesouroDiretoAtivo, FixedIncomeType> = {
  tesouro_selic: "tesouro_selic",
  tesouro_ipca: "tesouro_ipca",
  tesouro_pre: "tesouro_pre",
  tesouro_ipca_juros: "tesouro_ipca",
  tesouro_pre_juros: "tesouro_pre",
};

const RF_TYPES: { value: FixedIncomeType; label: string }[] = [
  { value: "rdb_cdi", label: "RDB CDI" },
  { value: "rdb_pre", label: "RDB Prefixado" },
  { value: "cdb_cdi", label: "CDB CDI" },
  { value: "cdb_pre", label: "CDB Pré" },
  { value: "lci_cdi", label: "LCI CDI" },
  { value: "lca_cdi", label: "LCA CDI" },
  { value: "lci_pre", label: "LCI Pré" },
  { value: "lca_pre", label: "LCA Pré" },
];

export function QuickTransactionModal(props: QuickTransactionModalProps) {
  const { selectedWallet } = useWallets();
  const { user } = useAuth();
  return (
    <QuickTransactionForm
      key={`${user?.id}:${selectedWallet?.id}:${props.initialAsset?.ticker ?? props.initialTicker ?? props.initialFixedIncome?.name ?? "new"}`}
      {...props}
    />
  );
}

function QuickTransactionForm({
  isOpen,
  onClose,
  initialAsset,
  initialTicker = initialAsset?.ticker ?? "",
  initialFixedIncome,
}: QuickTransactionModalProps) {
  const { selectedWallet } = useWallets();
  const { user } = useAuth();
  const storageKey =
    user && selectedWallet
      ? draftKey(
          user.id,
          selectedWallet.id,
          initialTicker
            ? `transaction:asset:${initialTicker}`
            : `transaction:${initialFixedIncome?.name ?? "new"}`,
        )
      : null;
  const legacyStorageKey = user && selectedWallet && initialAsset
    ? draftKey(user.id, selectedWallet.id, `detail-transaction:${initialAsset.ticker}`)
    : null;
  const [draftAvailable, setDraftAvailable] = useState(
    () => Boolean(readTransactionDraft(storageKey, legacyStorageKey, initialAsset)),
  );
  const [draftWarning, setDraftWarning] = useState(false);
  const { data: positions = [] } = usePositions(selectedWallet?.id ?? "");
  const addTransaction = useAddTransaction();
  const externalAsset = useLookupExternalAsset();
  const addFI = useAddFixedIncomePosition();
  const { calc: calcValues } = useCalcFixedIncome();

  const [assetClass, setAssetClass] = useState<FormCategory | "">(initialAsset?.type ?? "");

  // Campos renda variável
  const [type, setType] = useState<"buy" | "sell">("buy");
  const [ticker, setTicker] = useState(initialTicker);
  const [date, setDate] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [priceManuallyEdited, setPriceManuallyEdited] = useState(false);
  const [showAssetSuggestions, setShowAssetSuggestions] = useState(false);
  const [highlightedAssetIndex, setHighlightedAssetIndex] = useState(-1);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(initialAsset ?? null);
  const [otherCosts, setOtherCosts] = useState("");

  // Campos renda fixa
  const [rfEmissor, setRfEmissor] = useState("");
  const [rfTipo, setRfTipo] = useState<FixedIncomeType | "">("");
  const [rfTaxa, setRfTaxa] = useState("");
  const [rfValor, setRfValor] = useState("");
  const [rfDate, setRfDate] = useState("");
  const [rfMaturity, setRfMaturity] = useState("");

  // Campos tesouro direto
  const [tdAtivo, setTdAtivo] = useState<TesouroDiretoAtivo | "">("");
  const [tdTaxa, setTdTaxa] = useState("");
  const [tdDate, setTdDate] = useState("");
  const [tdMaturity, setTdMaturity] = useState("");
  const [tdQty, setTdQty] = useState("");
  const [tdPrice, setTdPrice] = useState("");
  const [tdOther, setTdOther] = useState("");

  const [error, setError] = useState("");
  const [changingCurrency, setChangingCurrency] = useState(false);
  const draftValues = {
    ticker,
    date,
    quantity,
    price,
    otherCosts,
    rfEmissor,
    rfTipo,
    rfTaxa,
    rfValor,
    rfDate,
    rfMaturity,
    tdAtivo,
    tdTaxa,
    tdDate,
    tdMaturity,
    tdQty,
    tdPrice,
    tdOther,
  };
  const serializedDraft = JSON.stringify({
    assetClass,
    type,
    values: draftValues,
  });
  useEffect(() => {
    if (isOpen)
      setDraftAvailable(Boolean(readTransactionDraft(storageKey, legacyStorageKey, initialAsset)));
  }, [isOpen, storageKey, legacyStorageKey, initialAsset]);
  useEffect(() => {
    if (
      !isOpen ||
      !storageKey ||
      draftAvailable ||
      (initialTicker
        ? !(ticker !== initialTicker || quantity || date || otherCosts || priceManuallyEdited || type === "sell" || rfValor || tdQty || tdPrice)
        : !(ticker || quantity || price || rfValor || tdQty || tdPrice))
    )
      return;
    setDraftWarning(!saveDraft(storageKey, JSON.parse(serializedDraft)));
  }, [
    isOpen,
    storageKey,
    draftAvailable,
    serializedDraft,
    initialTicker,
    ticker,
    date,
    otherCosts,
    priceManuallyEdited,
    type,
    quantity,
    price,
    rfValor,
    tdQty,
    tdPrice,
  ]);
  function discardDraft() {
    if (storageKey) removeDraft(storageKey);
    if (legacyStorageKey) removeDraft(legacyStorageKey);
    setDraftAvailable(false);
  }

  function restoreDraft() {
    const draft = readTransactionDraft(storageKey, legacyStorageKey, initialAsset);
    if (!draft) return;
    const v = draft.values;
    setAssetClass(draft.assetClass);
    setType(draft.type);
    setTicker(v.ticker ?? "");
    setDate(v.date ?? "");
    setQuantity(v.quantity ?? "");
    setPrice(v.price ?? "");
    setOtherCosts(v.otherCosts ?? "");
    setPriceManuallyEdited(true);
    setSelectedAsset(initialAsset && initialAsset.ticker === v.ticker ? initialAsset : null);
    setRfEmissor(v.rfEmissor ?? "");
    setRfTipo(
      RF_TYPES.some((t) => t.value === v.rfTipo)
        ? (v.rfTipo as FixedIncomeType)
        : "",
    );
    setRfTaxa(v.rfTaxa ?? "");
    setRfValor(v.rfValor ?? "");
    setRfDate(v.rfDate ?? "");
    setRfMaturity(v.rfMaturity ?? "");
    setTdAtivo(
      Object.prototype.hasOwnProperty.call(TD_NAME, v.tdAtivo ?? "")
        ? (v.tdAtivo as TesouroDiretoAtivo)
        : "",
    );
    setTdTaxa(v.tdTaxa ?? "");
    setTdDate(v.tdDate ?? "");
    setTdMaturity(v.tdMaturity ?? "");
    setTdQty(v.tdQty ?? "");
    setTdPrice(v.tdPrice ?? "");
    setTdOther(v.tdOther ?? "");
    setDraftAvailable(false);
  }

  const isSaving =
    addTransaction.isPending ||
    addFI.isPending ||
    externalAsset.state.status === "loading";

  const isRendaFixa = assetClass === "fixed_income";
  const isTesouroDireto = assetClass === "tesouro_direto";
  const isVariavel = !isRendaFixa && !isTesouroDireto;
  const debouncedTicker = useDebouncedValue(ticker, 250);
  const { data: assetSuggestions = [], isFetching: isSearchingAssets } =
    useAssetSearch(debouncedTicker);
  const suggestionsReady = debouncedTicker.trim() === ticker.trim();
  const visibleSuggestions = suggestionsReady
    ? assetSuggestions.filter((asset) =>
        ASSET_TYPES.some(([type]) => type === asset.type),
      )
    : [];
  const selectedTicker = isOpen && isVariavel ? selectedAsset?.ticker : undefined;
  const latestPrice = useTickerLatestPrice(selectedTicker ?? "");
  const { data: quotes } = useLatestQuotes(selectedTicker ? [selectedTicker] : []);
  const dailyChangePct = useDailyChange(
    quotes?.find((quote) => quote.ticker === selectedTicker) ?? null,
  );
  const { data: catalogAsset } = useQuery({
    queryKey: ["portfolio", "asset", ticker],
    queryFn: () => positionService.findAssetByTicker(ticker),
    enabled: isOpen && isVariavel && ticker.trim().length >= 2,
  });

  useEffect(() => {
    if (
      isVariavel &&
      selectedAsset?.ticker === ticker.trim().toUpperCase() &&
      latestPrice !== null &&
      !priceManuallyEdited
    ) {
      setPrice(String(latestPrice));
    }
  }, [isVariavel, latestPrice, priceManuallyEdited, ticker, selectedAsset]);

  useEffect(() => {
    setHighlightedAssetIndex((current) =>
      Math.min(current, visibleSuggestions.length - 1),
    );
  }, [visibleSuggestions.length]);

  // Derivados renda variável
  const parsedQty = Number(quantity.replace(",", "."));
  const parsedPrice = Number(price.replace(",", "."));
  const parsedOther = Number(otherCosts.replace(",", ".")) || 0;
  const totalVar =
    parsedQty > 0 && price && parsedPrice >= 0
      ? parsedQty * parsedPrice + (type === "buy" ? parsedOther : -parsedOther)
      : 0;

  // Derivados tesouro direto
  const tdParsedQty = Number(tdQty.replace(",", "."));
  const tdParsedPrice = Number(tdPrice.replace(",", "."));
  const tdParsedOther = Number(tdOther.replace(",", ".")) || 0;
  const totalTD =
    tdParsedQty > 0 && tdParsedPrice >= 0
      ? tdParsedQty * tdParsedPrice + tdParsedOther
      : 0;

  // Derivados renda fixa
  const rfIndexer = rfTipo ? FIXED_INCOME_TYPE_INDEXER[rfTipo] : null;
  const rfTaxaLabel = rfIndexer ? FIXED_INCOME_RATE_LABEL[rfIndexer] : "Taxa";
  const rfIndexerLabel = rfIndexer
    ? ({ cdi: "CDI", ipca: "IPCA", pre: "Prefixado", selic: "SELIC" } as const)[
        rfIndexer
      ]
    : "—";

  // Derivados tesouro direto
  const tdDbType = tdAtivo ? TD_DB_TYPE[tdAtivo] : null;
  const tdIndexer = tdDbType ? FIXED_INCOME_TYPE_INDEXER[tdDbType] : null;
  const tdTaxaLabel = tdIndexer ? FIXED_INCOME_RATE_LABEL[tdIndexer] : "Taxa";

  const defaultCurrency = ["stock_us", "etf_us", "reit", "crypto"].some(
    (type) => type === assetClass,
  )
    ? "USD"
    : "BRL";
  const quoteCurrency = isVariavel
    ? (selectedAsset?.currency ?? catalogAsset?.currency ?? defaultCurrency)
    : "BRL";
  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: quoteCurrency });
  const isSale = isVariavel && type === "sell";
  const total = isVariavel
    ? totalVar
    : isTesouroDireto
      ? totalTD
      : Number(rfValor.replace(",", ".")) || 0;
  const accent = isSale ? "text-rose-300" : "text-emerald-300";

  function resetFields() {
    discardDraft();
    externalAsset.reset();
    setError("");
    setType("buy");
    setTicker("");
    setDate("");
    setQuantity("");
    setPrice("");
    setPriceManuallyEdited(false);
    setOtherCosts("");
    setShowAssetSuggestions(false);
    setHighlightedAssetIndex(-1);
    setSelectedAsset(null);
    setRfEmissor("");
    setRfTipo("");
    setRfTaxa("");
    setRfValor("");
    setRfDate("");
    setRfMaturity("");
    setTdAtivo("");
    setTdTaxa("");
    setTdDate("");
    setTdMaturity("");
    setTdQty("");
    setTdPrice("");
    setTdOther("");
  }

  useEffect(() => {
    if (!isOpen || !initialFixedIncome) return;
    setAssetClass("fixed_income");
    setType("buy");
    setRfEmissor(initialFixedIncome.name);
    setRfTipo(initialFixedIncome.type);
    setRfTaxa(String(initialFixedIncome.rate));
    setRfValor("");
    setRfDate("");
    setRfMaturity("");
    setError("");
  }, [isOpen, initialFixedIncome]);

  function selectAsset(asset: Asset) {
    if (!ASSET_TYPES.some(([type]) => type === asset.type)) {
      setError(
        "Use o seletor Tipo de ativo para lançar um título de renda fixa.",
      );
      return;
    }
    setError("");
    setAssetClass(asset.type);
    if (selectedAsset?.ticker !== asset.ticker) setPrice("");
    if (asset.currency !== quoteCurrency) setOtherCosts("");
    setTicker(asset.ticker);
    setSelectedAsset(asset);
    setShowAssetSuggestions(false);
    setHighlightedAssetIndex(-1);
    setPriceManuallyEdited(false);
  }

  async function changeCryptoCurrency(currency: string) {
    setChangingCurrency(true);
    setError("");
    try {
      const base = ticker.replace(/-BRL$/, "");
      const asset = await positionService.findAssetByTicker(
        currency === "BRL" ? `${base}-BRL` : base,
      );
      if (!asset) {
        setError("Esta moeda não está disponível para o ativo.");
        return;
      }
      setPrice("");
      setOtherCosts("");
      selectAsset(asset);
    } catch {
      setError("Não foi possível consultar a moeda. Tente novamente.");
    } finally {
      setChangingCurrency(false);
    }
  }

  function handleTickerKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (
      event.key === "Escape" &&
      showAssetSuggestions &&
      ticker.trim().length >= 2
    ) {
      event.stopPropagation();
      setShowAssetSuggestions(false);
      setHighlightedAssetIndex(-1);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (visibleSuggestions.length === 0) return;
      event.preventDefault();
      setShowAssetSuggestions(true);
      const step = event.key === "ArrowDown" ? 1 : -1;
      setHighlightedAssetIndex((current) => {
        const next = current + step;
        if (next < 0) return visibleSuggestions.length - 1;
        if (next >= visibleSuggestions.length) return 0;
        return next;
      });
      return;
    }

    const highlightedAsset = visibleSuggestions[highlightedAssetIndex];
    if (event.key === "Enter" && showAssetSuggestions && highlightedAsset) {
      event.preventDefault();
      selectAsset(highlightedAsset);
    }
  }

  function handleClose() {
    setAssetClass("");
    resetFields();
    onClose();
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const movementDate = isRendaFixa ? rfDate : isTesouroDireto ? tdDate : date;
    const validation = movementDateSchema.safeParse(movementDate);
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }
    setError("");

    // ── Renda Fixa ────────────────────────────────────────────────────────
    if (isRendaFixa) {
      if (!rfEmissor.trim()) {
        setError("Informe o emissor.");
        return;
      }
      if (!rfTipo) {
        setError("Selecione o tipo de título.");
        return;
      }
      const taxa = Number(rfTaxa.replace(",", "."));
      if (isNaN(taxa) || taxa < 0) {
        setError("Informe uma taxa válida.");
        return;
      }
      const valor = Number(rfValor.replace(",", "."));
      if (isNaN(valor) || valor <= 0) {
        setError("Informe o valor aplicado.");
        return;
      }

      const payload: NewFixedIncomePosition = {
        name: rfEmissor.trim(),
        type: rfTipo,
        indexer: FIXED_INCOME_TYPE_INDEXER[rfTipo],
        rate: taxa,
        principal: valor,
        application_date: rfDate,
        maturity_date: rfMaturity.trim() || null,
      };
      addFI.mutate(payload, {
        onSuccess: () => {
          calcValues();
          handleClose();
        },
        onError: () => setError("Não foi possível salvar. Tente novamente."),
      });
      return;
    }

    // ── Tesouro Direto ────────────────────────────────────────────────────
    if (isTesouroDireto) {
      if (!tdAtivo) {
        setError("Selecione o ativo.");
        return;
      }
      const taxa = Number(tdTaxa.replace(",", "."));
      if (isNaN(taxa) || taxa < 0) {
        setError("Informe uma taxa válida.");
        return;
      }
      if (tdParsedQty < 0.01) {
        setError("Quantidade mínima: 0,01.");
        return;
      }
      if (tdParsedPrice < 0) {
        setError("Informe o preço.");
        return;
      }

      const dbType = TD_DB_TYPE[tdAtivo];
      const payload: NewFixedIncomePosition = {
        name: TD_NAME[tdAtivo],
        type: dbType,
        indexer: FIXED_INCOME_TYPE_INDEXER[dbType],
        rate: taxa,
        principal: tdParsedQty * tdParsedPrice + tdParsedOther,
        application_date: tdDate,
        maturity_date: tdMaturity.trim() || null,
        treasury_quantity:
          !tdAtivo.endsWith("_juros") && tdMaturity.trim() ? tdParsedQty : null,
      };
      addFI.mutate(payload, {
        onSuccess: () => {
          calcValues();
          handleClose();
        },
        onError: () => setError("Não foi possível salvar. Tente novamente."),
      });
      return;
    }

    // ── Renda Variável ────────────────────────────────────────────────────
    const norm = ticker.trim().toUpperCase();
    if (!norm || !date || parsedQty <= 0 || !price.trim() || parsedPrice < 0) {
      setError("Preencha ativo, data, quantidade e preço válidos.");
      return;
    }
    if (type === "sell") {
      const pos = positions.find((p) => p.ticker === norm);
      if (!pos || parsedQty > Number(pos.quantity)) {
        setError("A venda não pode superar a quantidade desta carteira.");
        return;
      }
    }
    try {
      const asset =
        (selectedAsset?.ticker === norm
          ? selectedAsset
          : await positionService.findAssetByTicker(norm)) ??
        (await externalAsset.lookup(norm));
      if (!asset) {
        setError("Ativo não encontrado no catálogo.");
        return;
      }
      if (!ASSET_TYPES.some(([type]) => type === asset.type)) {
        setError(
          "Use o seletor Tipo de ativo para lançar um título de renda fixa.",
        );
        return;
      }
      if (asset.currency !== quoteCurrency) {
        selectAsset(asset);
        setError(
          `Confira o preço e informe os custos em ${asset.currency} antes de salvar.`,
        );
        return;
      }
      await addTransaction.mutateAsync({
        ticker: norm,
        type,
        transaction_date: date,
        quantity: parsedQty,
        price: parsedPrice,
        brokerage_fee: parsedOther,
      });
      handleClose();
    } catch {
      setError("Não foi possível salvar o lançamento. Tente novamente.");
    }
  }

  const inputClass =
    "block h-12 w-full min-w-0 rounded-xl border border-white/10 bg-[#222] px-3 text-base text-white placeholder:text-white/35 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30";
  const dateClass = `${inputClass} transaction-date max-w-[12rem]`;
  const labelClass = "mb-1.5 block text-sm text-white/75";
  const dateQuantityClass =
    "grid grid-cols-2 gap-2 [&>*]:min-w-0 sm:col-span-2 sm:gap-4";

  return (
    <Modal
      isOpen={isOpen}
      title="Adicionar Lançamento"
      onClose={handleClose}
      dismissible={!isSaving}
      variant="transaction"
      transactionDrawer
    >
      <form id="quick-transaction-form" onSubmit={submit} className="space-y-5">
        {draftAvailable && (
          <div
            role="status"
            className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/70"
          >
            Há um rascunho desta carteira guardado neste dispositivo por até 8
            horas.
            Confira os dados antes de salvar.
            <button
              type="button"
              className="ml-2 underline"
              onClick={restoreDraft}
            >
              Restaurar rascunho
            </button>
            <button
              type="button"
              className="ml-2 underline"
              onClick={discardDraft}
            >
              Descartar rascunho
            </button>
          </div>
        )}
        {draftWarning && (
          <p role="status" className="text-sm text-amber-200">
            O navegador não permitiu guardar o rascunho. Campos podem ser
            perdidos ao recarregar.
          </p>
        )}

        {isVariavel && (
          <div
            role="group"
            aria-label="Tipo de operação"
            className="grid grid-cols-2 gap-2"
          >
            {(["buy", "sell"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                aria-pressed={type === t}
                className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors ${
                  type === t
                    ? t === "buy"
                      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                      : "border-rose-400/40 bg-rose-400/10 text-rose-300"
                    : "border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/10"
                }`}
              >
                {t === "buy" ? (
                  <ArrowDownLeft size={18} aria-hidden="true" />
                ) : (
                  <ArrowUpRight size={18} aria-hidden="true" />
                )}
                {t === "buy" ? "Compra" : "Venda"}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 [&>*]:min-w-0 sm:grid-cols-2">
          {isVariavel && (
            <div className="relative z-10 sm:col-span-2">
              <div className="mb-2 flex items-center justify-between gap-2">
                <label htmlFor="qt-ticker" className="text-base font-semibold text-white">
                  Ativo
                </label>
                {dailyChangePct !== null && Number.isFinite(dailyChangePct) && (
                  <span className={`flex min-w-0 items-center gap-1 text-xs tabular-nums ${
                    dailyChangePct > 0 ? "text-emerald-300" : dailyChangePct < 0 ? "text-rose-300" : "text-white/60"
                  }`}>
                    <ChartNoAxesCombined size={13} aria-hidden="true" className="shrink-0" />
                    <span className="truncate">{fmtPct(dailyChangePct)} no último fechamento</span>
                  </span>
                )}
              </div>
              <div className="relative">
                <Search
                  size={19}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-300"
                />
                <input
                  id="qt-ticker"
                  value={ticker}
                  onChange={(e) => {
                    setTicker(e.target.value);
                    if (selectedAsset) {
                      setAssetClass("");
                      setOtherCosts("");
                    }
                    setPrice("");
                    externalAsset.reset();
                    setPriceManuallyEdited(false);
                    setSelectedAsset(null);
                    setShowAssetSuggestions(true);
                    setHighlightedAssetIndex(-1);
                  }}
                  onFocus={() => {
                    if (!selectedAsset) setShowAssetSuggestions(true);
                  }}
                  onKeyDown={handleTickerKeyDown}
                  className={`${inputClass} h-14 border-blue-400/35 pl-10 ${selectedAsset ? "pb-4 pr-10 font-semibold" : ""}`}
                  placeholder="Buscar por nome ou código"
                  autoComplete="off"
                  enterKeyHint="search"
                  maxLength={100}
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={
                    showAssetSuggestions && ticker.trim().length >= 2
                  }
                  aria-controls="qt-asset-options"
                />
                {selectedAsset && (
                  <div
                    key={selectedAsset.ticker}
                    className="transaction-asset-confirmation pointer-events-none absolute inset-0"
                    role="status"
                  >
                    <span className="absolute bottom-1.5 left-10 right-10 truncate text-xs text-white/65">
                      {selectedAsset.name} · {selectedAsset.currency}
                    </span>
                    <Check
                      size={18}
                      aria-hidden="true"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-300"
                    />
                  </div>
                )}
              </div>
              {showAssetSuggestions && ticker.trim().length >= 2 && (
                <div
                  id="qt-asset-options"
                  className="transaction-asset-options absolute inset-x-0 top-full mt-2 max-h-44 overflow-y-auto overscroll-contain rounded-2xl border p-1.5"
                >
                  {(isSearchingAssets || !suggestionsReady) && (
                    <p className="px-3 py-2 text-xs text-white/50">
                      Buscando ativos...
                    </p>
                  )}
                  {!isSearchingAssets &&
                    suggestionsReady &&
                    visibleSuggestions.length === 0 && (
                      <div className="px-3 py-2 text-xs text-white/50">
                        <p>
                          Nenhum ativo encontrado no catálogo. Digite o ticker
                          para buscar na fonte externa.
                        </p>
                        <button
                          type="button"
                          disabled={externalAsset.state.status === "loading"}
                          className="mt-2 text-blue-300 underline"
                          onClick={async () => {
                            const asset =
                              catalogAsset ??
                              (await externalAsset.lookup(ticker));
                            if (asset) selectAsset(asset);
                          }}
                        >
                          {catalogAsset
                            ? `Selecionar ${catalogAsset.ticker}`
                            : externalAsset.state.status === "loading"
                              ? "Buscando…"
                              : "Buscar ticker na fonte externa"}
                        </button>
                        {externalAsset.state.status === "not_found" && (
                          <p role="status" className="mt-2">
                            Ticker não encontrado. Confira o código e tente
                            novamente.
                          </p>
                        )}
                        {externalAsset.state.status === "error" && (
                          <p role="status" className="mt-2">
                            Não foi possível buscar o ativo. Tente novamente.
                          </p>
                        )}
                      </div>
                    )}
                  {visibleSuggestions.map((asset, index) => (
                    <button
                      key={`${asset.type}-${asset.ticker}`}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectAsset(asset)}
                      className={`flex min-h-12 w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-[background-color,transform] active:bg-white/15 motion-safe:active:scale-[0.98] ${index === highlightedAssetIndex ? "bg-white/[0.12]" : "hover:bg-white/[0.08]"}`}
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-white">
                          {asset.ticker}
                        </span>
                        <span className="block truncate text-xs text-white/50">
                          {asset.name}
                        </span>
                      </span>
                      <span className="ml-2 shrink-0 text-[10px] text-white/40">
                        {ASSET_TYPES.find(([type]) => type === asset.type)?.[1]}{" "}
                        · {asset.currency}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div>
            <label htmlFor="qt-asset-class" className={labelClass}>
              Tipo de ativo
            </label>
            <div className="relative">
              <select
                id="qt-asset-class"
                value={assetClass}
                onChange={(e) => {
                  const category = e.target.value as FormCategory | "";
                  if (
                    !isVariavel ||
                    category === "fixed_income" ||
                    category === "tesouro_direto"
                  )
                    resetFields();
                  else {
                    setPrice("");
                    setPriceManuallyEdited(false);
                    setOtherCosts("");
                    if (selectedAsset) {
                      setTicker("");
                      setSelectedAsset(null);
                    }
                  }
                  setAssetClass(category);
                }}
                className={`${inputClass} appearance-none pr-8`}
              >
                <option value="">Automático</option>
                {ASSET_TYPES.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
                <option value="fixed_income">Renda Fixa</option>
                <option value="tesouro_direto">Tesouro Direto</option>
              </select>
              <ChevronDown
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/50"
              />
            </div>
          </div>
          {isRendaFixa && (
            <div>
              <label htmlFor="qt-rf-tipo" className={labelClass}>
                Tipo de título
              </label>
              <select
                id="qt-rf-tipo"
                value={rfTipo}
                onChange={(e) => setRfTipo(e.target.value as FixedIncomeType)}
                className={`${inputClass} appearance-none`}
              >
                <option value="">Selecione</option>
                {RF_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          {isTesouroDireto && (
            <div>
              <label htmlFor="qt-td-ativo" className={labelClass}>
                Ativo
              </label>
              <select
                id="qt-td-ativo"
                value={tdAtivo}
                onChange={(e) =>
                  setTdAtivo(e.target.value as TesouroDiretoAtivo)
                }
                className={`${inputClass} appearance-none`}
              >
                <option value="">Selecione</option>
                <option value="tesouro_selic">Tesouro Selic</option>
                <option value="tesouro_ipca">Tesouro IPCA+</option>
                <option value="tesouro_pre">Tesouro Prefixado</option>
                <option value="tesouro_ipca_juros">
                  Tesouro IPCA+ c/ Juros Semestrais
                </option>
                <option value="tesouro_pre_juros">
                  Tesouro Prefixado c/ Juros Semestrais
                </option>
              </select>
            </div>
          )}

          {/* Campos renda variável */}
          {isVariavel && (
            <>
              {assetClass === "crypto" && (
                <div className="sm:col-span-2">
                  <label htmlFor="qt-crypto-currency" className={labelClass}>
                    Moeda do lançamento
                  </label>
                  <select
                    id="qt-crypto-currency"
                    value={quoteCurrency}
                    disabled={!catalogAsset || changingCurrency}
                    className={inputClass}
                    onChange={(event) => {
                      void changeCryptoCurrency(event.target.value);
                    }}
                  >
                    <option value="BRL">Real (BRL)</option>
                    <option value="USD">Dólar (USD)</option>
                  </select>
                  <p className="mt-1 text-xs text-white/50">
                    Informe preço e custos na moeda escolhida. Posições em BRL e
                    USD são acompanhadas separadamente.
                  </p>
                </div>
              )}
              <div className={dateQuantityClass}>
                <div>
                  <label htmlFor="qt-date" className={labelClass}>
                    Data da transação
                  </label>
                  <input
                    id="qt-date"
                    type="date"
                    max={toIsoDate(new Date())}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={dateClass}
                  />
                </div>
                <QuantityField
                  id="qt-qty"
                  value={quantity}
                  onChange={setQuantity}
                />
              </div>
              <div>
                <label htmlFor="qt-price" className={labelClass}>
                  Preço unitário ({quoteCurrency})
                </label>
                <input
                  id="qt-price"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    setPriceManuallyEdited(true);
                  }}
                  className={inputClass}
                  placeholder="0,00"
                  min={0}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="qt-other-costs" className={labelClass}>
                  Outros custos ({quoteCurrency}){" "}
                  <span className="text-xs text-white/50">Opcional</span>
                </label>
                <input
                  id="qt-other-costs"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={otherCosts}
                  onChange={(e) => setOtherCosts(e.target.value)}
                  className={inputClass}
                  placeholder="0,00"
                  min={0}
                />
              </div>
            </>
          )}

          {/* Campos renda fixa */}
          {isRendaFixa && (
            <>
              <div>
                <label htmlFor="qt-rf-emissor" className={labelClass}>
                  Emissor
                </label>
                <input
                  id="qt-rf-emissor"
                  type="text"
                  autoComplete="off"
                  value={rfEmissor}
                  onChange={(e) => setRfEmissor(e.target.value)}
                  className={inputClass}
                  placeholder="Ex: Banco Itaú"
                />
              </div>
              <div>
                <label htmlFor="qt-rf-indexador" className={labelClass}>
                  Indexador
                </label>
                <div className="rounded-xl border border-white/[0.12] bg-[#2A2A2A] px-3 py-2.5 text-sm text-white/50">
                  {rfIndexerLabel}
                </div>
              </div>
              <div>
                <label htmlFor="qt-rf-taxa" className={labelClass}>
                  {rfTaxaLabel}
                </label>
                <input
                  id="qt-rf-taxa"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={rfTaxa}
                  onChange={(e) => setRfTaxa(e.target.value)}
                  className={inputClass}
                  placeholder="110"
                  min={0}
                  disabled={!rfTipo}
                />
              </div>
              <div>
                <label htmlFor="qt-rf-valor" className={labelClass}>
                  Valor (R$)
                </label>
                <input
                  id="qt-rf-valor"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={rfValor}
                  onChange={(e) => setRfValor(e.target.value)}
                  className={inputClass}
                  placeholder="0,00"
                  min={0}
                />
              </div>
              <div>
                <label htmlFor="qt-rf-date" className={labelClass}>
                  Data da transação
                </label>
                <input
                  id="qt-rf-date"
                  type="date"
                  max={toIsoDate(new Date())}
                  value={rfDate}
                  onChange={(e) => setRfDate(e.target.value)}
                  className={dateClass}
                />
              </div>
              <div>
                <label htmlFor="qt-rf-maturity" className={labelClass}>
                  Vencimento <span className="text-white/30">OPCIONAL</span>
                </label>
                <input
                  id="qt-rf-maturity"
                  type="date"
                  value={rfMaturity}
                  onChange={(e) => setRfMaturity(e.target.value)}
                  className={dateClass}
                />
              </div>
            </>
          )}

          {/* Campos tesouro direto */}
          {isTesouroDireto && (
            <>
              <div>
                <label htmlFor="qt-td-taxa" className={labelClass}>
                  {tdTaxaLabel}
                </label>
                <input
                  id="qt-td-taxa"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={tdTaxa}
                  onChange={(e) => setTdTaxa(e.target.value)}
                  className={inputClass}
                  placeholder="13.5"
                  min={0}
                  disabled={!tdAtivo}
                />
              </div>
              <div>
                <label htmlFor="qt-td-maturity" className={labelClass}>
                  Vencimento <span className="text-white/30">OPCIONAL</span>
                </label>
                <input
                  id="qt-td-maturity"
                  type="date"
                  value={tdMaturity}
                  onChange={(e) => setTdMaturity(e.target.value)}
                  className={dateClass}
                />
              </div>
              <div className={dateQuantityClass}>
                <div>
                  <label htmlFor="qt-td-date" className={labelClass}>
                    Data da transação
                  </label>
                  <input
                    id="qt-td-date"
                    type="date"
                    max={toIsoDate(new Date())}
                    value={tdDate}
                    onChange={(e) => setTdDate(e.target.value)}
                    className={dateClass}
                  />
                </div>
                <QuantityField
                  id="qt-td-qty"
                  value={tdQty}
                  onChange={setTdQty}
                  step={0.01}
                />
              </div>
              <div>
                <label htmlFor="qt-td-price" className={labelClass}>
                  Preço (R$)
                </label>
                <input
                  id="qt-td-price"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={tdPrice}
                  onChange={(e) => setTdPrice(e.target.value)}
                  className={inputClass}
                  placeholder="0,00"
                  min={0}
                />
              </div>
              <div>
                <label htmlFor="qt-td-other" className={labelClass}>
                  Outros custos ({quoteCurrency}){" "}
                  <span className="text-white/30">OPCIONAL</span>
                </label>
                <input
                  id="qt-td-other"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={tdOther}
                  onChange={(e) => setTdOther(e.target.value)}
                  className={inputClass}
                  placeholder="0,00"
                  min={0}
                />
              </div>
            </>
          )}
        </div>

        <div className="space-y-2 border-t border-white/10 pt-4">
          {error && (
            <p role="alert" className="text-sm text-rose-300">
              {error}
            </p>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-white/70">
              Valor total{isSale ? " líquido" : ""}
            </span>
            <output className={`text-xl font-semibold tabular-nums ${accent}`}>
              {fmt(total)}
            </output>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className="min-h-11 rounded-xl px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || changingCurrency || !selectedWallet}
              className={`min-h-11 flex-1 rounded-xl px-3 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${isSale ? "bg-rose-700 hover:bg-rose-600" : "bg-blue-600 hover:bg-blue-500"}`}
            >
              {externalAsset.state.status === "loading"
                ? "Buscando ativo…"
                : isSaving
                  ? "Salvando…"
                  : isSale
                    ? "Salvar venda"
                    : "Salvar compra"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
