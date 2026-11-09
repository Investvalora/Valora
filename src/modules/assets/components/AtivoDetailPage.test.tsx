import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AtivoDetailPage } from "./AtivoDetailPage";
import { valueAssets } from "../../ativos/assetValuation";
import type {
  FixedIncomePosition,
  LatestQuote,
  PositionWithAsset,
} from "../../portfolio/types";

const assetDetail = vi.hoisted(() => vi.fn());
const transactions = vi.hoisted(() => vi.fn());
const history = vi.hoisted(() => vi.fn());
const priceData = vi.hoisted(() => vi.fn());
const create = vi.hoisted(() => vi.fn());
const valuation = vi.hoisted(() => vi.fn());
const received = vi.hoisted(() => vi.fn());
const marketDividends = vi.hoisted(() => vi.fn());
const assetSearch = vi.hoisted(() => vi.fn());
vi.mock("../../portfolio/hooks/useAssetSearch", () => ({
  useAssetSearch: (term: string) => assetSearch(term),
}));
vi.mock("../../alerts/services/alertQuoteService", () => ({
  alertQuoteService: { resolveAsset: async () => null },
}));
beforeEach(() => {
  assetDetail.mockReturnValue({
    data: {
      ticker: "PETR4",
      name: "Petrobras",
      type: "stock_br",
      currency: "BRL",
    },
  });
  transactions.mockReturnValue({ data: [] });
  priceData.mockReturnValue([]);
  assetSearch.mockReturnValue({ data: [], isFetching: false });
});
beforeEach(() => marketDividends.mockReturnValue({ data: [] }));
beforeEach(() =>
  received.mockReturnValue({ rows: [], isLoading: false, isError: false }),
);
vi.mock("../../dividends/hooks/useDividends", () => ({
  useDividends: () => received(),
}));
beforeEach(() =>
  valuation.mockReturnValue({
    positions: [],
    rows: [],
    isLoading: false,
    isError: false,
  }),
);
vi.mock("../../portfolio/hooks/useWallets", () => ({
  useWallets: () => ({ selectedWallet: { id: "w1" } }),
}));
vi.mock("../../ativos/hooks/useAtivosValuation", () => ({
  useAtivosValuation: (...args: unknown[]) => valuation(...args),
}));
vi.mock("../hooks/useDailyChange", () => ({ useDailyChange: () => -2.5 }));
vi.mock("../hooks/useAssetDetail", () => ({
  useAssetDetail: (ticker: string) => assetDetail(ticker),
}));
vi.mock("../hooks/usePriceHistory", () => ({
  usePriceHistory: (...args: unknown[]) => {
    history(...args);
    return { data: priceData() };
  },
}));
vi.mock("../hooks/useAssetDividends", () => ({
  useAssetDividends: () => marketDividends(),
}));
vi.mock("../../portfolio/hooks/usePositions", () => ({
  usePositions: () => ({ data: [] }),
}));
vi.mock("../../portfolio/hooks/useLatestQuotes", () => ({
  useLatestQuotes: () => ({ data: [{ ticker: "PETR4", close: 20 }] }),
}));
vi.mock("../../portfolio/hooks/useDividendTotals", () => ({
  useDividendTotals: () => new Map(),
}));
vi.mock("../../portfolio/hooks/useTransactions", () => ({
  useAllTransactions: () => transactions(),
}));
vi.mock("../../score/hooks/useFundamentals", () => ({
  useFundamentals: () => ({ data: [] }),
}));
vi.mock("../../score/hooks/useScoreRules", () => ({
  useScoreRules: () => ({ data: [] }),
}));
vi.mock("../../score/hooks/useScorePreferences", () => ({
  useScorePreferences: () => ({ data: null }),
}));
vi.mock("../../score/hooks/useCalculateScore", () => ({
  useCalculateScore: () => new Map(),
}));
vi.mock("../../valuation/hooks/useBazin", () => ({
  useBazin: () => ({ bazinByTicker: new Map() }),
}));
vi.mock("../../alerts/hooks/useAlerts", () => ({
  useAlerts: () => ({ data: [] }),
}));
vi.mock("../../alerts/hooks/useAlertMutations", () => ({
  useCreatePriceTargetAlert: () => ({ mutateAsync: create, isPending: false }),
}));
vi.mock("../../performance/hooks/usePerformance", () => ({
  usePerformance: () => ({ summary: { cdiReturnPct: 0.1 } }),
}));
vi.mock("../../portfolio/components/AddTransactionModal", () => ({
  AddTransactionModal: ({
    isOpen,
    ticker,
    assetName,
    assetType,
    onClose,
  }: {
    isOpen: boolean;
    ticker: string;
    assetName: string;
    assetType: string;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div role="dialog" aria-label="Lançamento">
        <p>
          {ticker} {assetName} {assetType}
        </p>
        <button onClick={onClose}>Cancelar lançamento</button>
      </div>
    ) : null,
}));

it("abre lançamento preenchido e cria alerta com o ticker do detalhe, permitindo corrigir uma falha", async () => {
  create.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({});
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={["/ativos/PETR4"]}>
      <Routes>
        <Route path="/ativos/:ticker" element={<AtivoDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
  await user.click(
    screen.getByRole("button", { name: "+ Lançamento do ativo" }),
  );
  expect(
    within(screen.getByRole("dialog", { name: "Lançamento" })).getByText(
      "PETR4 Petrobras stock_br",
    ),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Cancelar lançamento" }));
  await user.click(screen.getByRole("button", { name: "Criar alerta" }));
  const dialog = within(screen.getByRole("dialog", { name: "Criar alerta" }));
  expect(dialog.getByLabelText("Ativo (ticker)")).toHaveValue("PETR4");
  await user.click(dialog.getByRole("button", { name: "Criar alerta" }));
  expect(create).not.toHaveBeenCalled();
  await user.type(dialog.getByRole("spinbutton"), "25");
  await user.click(dialog.getByRole("button", { name: "Criar alerta" }));
  expect(dialog.getByRole("alert")).toHaveTextContent("Erro ao criar alerta");
  await user.click(dialog.getByRole("button", { name: "Criar alerta" }));
  expect(create).toHaveBeenLastCalledWith({
    ticker: "PETR4",
    targetPrice: 25,
    condition: "below",
  });
  expect(
    screen.queryByRole("dialog", { name: "Criar alerta" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Alertas" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

it("integra o resumo a Ativos sem o botão de voltar da página isolada", () => {
  render(
    <MemoryRouter initialEntries={["/ativos/explorar/PETR4?q=PETR4"]}>
      <Routes>
        <Route
          path="/ativos/explorar/:ticker"
          element={<AtivoDetailPage embedded />}
        />
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByText("PETR4")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "← Ativos" }),
  ).not.toBeInTheDocument();
});

it("mostra recebimentos históricos elegíveis e preserva o histórico público separado", async () => {
  marketDividends.mockReturnValue({
    data: [
      {
        ticker: "PETR4",
        ex_date: "2025-12-15",
        payment_date: "2025-12-30",
        type: "dividend",
        value_per_share: 1,
      },
    ],
  });
  received.mockReturnValue({
    rows: [
      {
        ticker: "PETR4",
        ex_date: "2026-01-05",
        payment_date: "2026-01-15",
        quantity: 3,
        value_per_share: 1,
        total_value: 3,
        currency: "BRL",
      },
      {
        ticker: "PETR4",
        ex_date: "2026-02-05",
        payment_date: "2026-02-15",
        quantity: 10,
        value_per_share: 0.33,
        total_value: 3.29,
        currency: "BRL",
        source: "imported",
      },
      {
        ticker: "OUTRO",
        payment_date: "2026-02-15",
        quantity: 100,
        value_per_share: 1,
        total_value: 100,
      },
    ],
    isLoading: false,
    isError: false,
  });
  render(
    <MemoryRouter initialEntries={["/ativo/PETR4"]}>
      <Routes>
        <Route path="/ativo/:ticker" element={<AtivoDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByText("15/01/2026")).toBeInTheDocument();
  expect(screen.getByText("15/02/2026")).toBeInTheDocument();
  expect(screen.getByText(/× 3$/)).toBeInTheDocument();
  expect(screen.getByText("Líquido importado")).toBeInTheDocument();
  expect(screen.getByText(/= R\$\s*3,29/)).toBeInTheDocument();
  expect(screen.queryByText(/= R\$\s*100,00/)).not.toBeInTheDocument();
  const user = userEvent.setup();
  await user.click(screen.getByRole("tab", { name: /^Proventos$/ }));
  expect(
    screen.getByRole("columnheader", { name: "Quantidade histórica" }),
  ).toBeInTheDocument();
  expect(screen.getByText(/3,29/)).toBeInTheDocument();
  await user.click(screen.getByRole("tab", { name: "Histórico do ativo" }));
  expect(screen.getByText("15/12/2025")).toBeInTheDocument();
  expect(
    screen.queryByRole("columnheader", { name: "Total recebido" }),
  ).not.toBeInTheDocument();
});

it("mostra peso sobre BRL, USD e renda fixa da carteira selecionada e separa variação diária do custo", async () => {
  const positions = [
    {
      id: "a",
      ticker: "PETR4",
      quantity: 10,
      average_price: 10,
      asset: { currency: "BRL", type: "stock_br" },
    },
    {
      id: "b",
      ticker: "AAPL",
      quantity: 1,
      average_price: 20,
      asset: { currency: "USD", type: "stock_us" },
    },
  ] as PositionWithAsset[];
  const valued = valueAssets(
    positions,
    [
      { ticker: "PETR4", close: 20 },
      { ticker: "AAPL", close: 20 },
    ] as LatestQuote[],
    [
      { name: "CDB", principal: 100, current_value: 100 },
    ] as FixedIncomePosition[],
    5,
  );
  valuation.mockReturnValue({
    ...valued,
    positions,
    isLoading: false,
    isError: false,
  });
  render(
    <MemoryRouter initialEntries={["/ativo/PETR4"]}>
      <Routes>
        <Route path="/ativo/:ticker" element={<AtivoDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
  expect(valuation).toHaveBeenCalledWith("w1", true);
  expect(screen.getByText("+50,00%")).toBeInTheDocument();
  expect(screen.getByText("-2,50% no último fechamento")).toBeInTheDocument();
  await userEvent.setup().click(screen.getByRole("tab", { name: "Rentab." }));
  expect(screen.getByText("+90,00 p.p.")).toBeInTheDocument();
});

it("seleciona cinco anos sem substituir Tudo", async () => {
  render(
    <MemoryRouter initialEntries={["/ativo/PETR4"]}>
      <Routes>
        <Route path="/ativo/:ticker" element={<AtivoDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "5A" }));
  expect(history).toHaveBeenLastCalledWith("PETR4", "5A");
  await user.click(screen.getByRole("button", { name: "Tudo" }));
  expect(history).toHaveBeenLastCalledWith("PETR4", "Tudo");
});

it("permite rolar o histórico no mobile com largura adequada ao período", async () => {
  priceData.mockReturnValue([
    { date: "2026-01-01", close: 20 },
    { date: "2026-11-09", close: 24 },
  ]);
  render(
    <MemoryRouter initialEntries={["/ativo/PETR4"]}>
      <Routes>
        <Route path="/ativo/:ticker" element={<AtivoDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
  const scrollArea = await screen.findByRole("region", {
    name: "Histórico de cotação com rolagem horizontal",
  });
  expect(scrollArea.previousElementSibling).toHaveClass("w-11", "shrink-0");
  expect(scrollArea.previousElementSibling).toHaveTextContent("20.00");
  expect(scrollArea.firstElementChild).toHaveClass(
    "min-w-[720px]",
    "sm:min-w-0",
  );
  expect(
    screen.getByText("Deslize o gráfico para ver datas anteriores."),
  ).toBeInTheDocument();
  await userEvent.setup().click(screen.getByRole("button", { name: "5A" }));
  expect(scrollArea.firstElementChild).toHaveClass("min-w-[960px]");
});

it("expande o gráfico, permite navegar pelo período e buscar outro ativo sem sair da tela cheia", async () => {
  priceData.mockReturnValue([
    { date: "2026-01-01", close: 20 },
    { date: "2026-11-09", close: 24 },
  ]);
  assetDetail.mockImplementation((ticker: string) => ({
    data: {
      ticker,
      name: ticker === "AAPL" ? "Apple Inc" : "Petrobras",
      type: "stock_br",
      currency: "BRL",
    },
  }));
  assetSearch.mockImplementation((term: string) => ({
    data:
      term.toUpperCase() === "AAPL"
        ? [
            {
              ticker: "AAPL",
              name: "Apple Inc",
              type: "stock_us",
              currency: "USD",
            },
          ]
        : [],
    isFetching: false,
  }));
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={["/ativos/explorar/PETR4"]}>
      <Routes>
        <Route
          path="/ativos/explorar/:ticker"
          element={<AtivoDetailPage embedded />}
        />
      </Routes>
    </MemoryRouter>,
  );

  await user.click(
    screen.getByRole("button", { name: "Expandir gráfico de cotação" }),
  );
  const expanded = screen.getByRole("dialog", {
    name: /Gráfico de cotação em tela cheia: PETR4/,
  });
  const scrollArea = within(expanded).getByRole("region", {
    name: "Histórico de cotação com rolagem horizontal",
  });
  expect(scrollArea.firstElementChild).toHaveStyle({
    minWidth: "max(100%, 2200px)",
  });
  Object.assign(scrollArea, {
    setPointerCapture: vi.fn(),
    hasPointerCapture: vi.fn(() => true),
    releasePointerCapture: vi.fn(),
    scrollLeft: 300,
  });
  fireEvent(
    scrollArea,
    new MouseEvent("pointerdown", { bubbles: true, clientX: 200 }),
  );
  fireEvent(
    scrollArea,
    new MouseEvent("pointermove", { bubbles: true, clientX: 100 }),
  );
  expect(scrollArea.scrollLeft).toBe(400);
  fireEvent(
    scrollArea,
    new MouseEvent("pointerup", { bubbles: true, clientX: 100 }),
  );
  expect(
    within(expanded).getByRole("button", { name: "Criar alerta" }),
  ).toBeInTheDocument();
  await user.click(within(expanded).getByRole("button", { name: "3M" }));
  expect(history).toHaveBeenLastCalledWith("PETR4", "3M");

  await user.type(
    within(expanded).getByRole("searchbox", { name: "Buscar outro ativo" }),
    "AAPL",
  );
  await user.click(
    await within(expanded).findByRole("button", { name: /AAPL Apple Inc/ }),
  );
  expect(
    screen.getByRole("dialog", {
      name: /Gráfico de cotação em tela cheia: AAPL/,
    }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Sair da tela cheia" }));
  expect(
    screen.queryByRole("dialog", { name: /Gráfico de cotação em tela cheia/ }),
  ).not.toBeInTheDocument();
});

it("mantém a tela cheia aberta enquanto o próximo ativo carrega", () => {
  assetDetail.mockReturnValue({ data: undefined, isLoading: true });
  render(
    <MemoryRouter
      initialEntries={[
        { pathname: "/ativos/explorar/AAPL", state: { chartExpanded: true } },
      ]}
    >
      <Routes>
        <Route
          path="/ativos/explorar/:ticker"
          element={<AtivoDetailPage embedded />}
        />
      </Routes>
    </MemoryRouter>,
  );
  const expanded = screen.getByRole("dialog", {
    name: /Gráfico de cotação em tela cheia: AAPL/,
  });
  expect(within(expanded).getByRole("status")).toHaveTextContent(
    "Carregando gráfico",
  );
  expect(
    within(expanded).getByRole("searchbox", { name: "Buscar outro ativo" }),
  ).toBeInTheDocument();
});

it.each([
  ["USD", "$51.91", "$103.82"],
  ["BRL", "R$ 51,91", "R$ 103,82"],
])(
  "preserva valores e moeda %s na previa e aba de lancamentos",
  async (currency, price, total) => {
    assetDetail.mockReturnValue({
      data: {
        ticker: "PETR4",
        name: "Ativo de teste",
        type: currency === "USD" ? "stock_us" : "stock_br",
        currency,
      },
    });
    transactions.mockReturnValue({
      data: [
        {
          id: "txn",
          ticker: "PETR4",
          type: "buy",
          quantity: 2,
          price: 51.91,
          transaction_date: "2026-10-30",
        },
      ],
    });
    render(
      <MemoryRouter initialEntries={["/ativo/PETR4"]}>
        <Routes>
          <Route path="/ativo/:ticker" element={<AtivoDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(total)).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("tab", { name: "Lançam." }));
    expect(
      within(screen.getByRole("table")).getByText(price),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("table")).getByText(total),
    ).toBeInTheDocument();
  },
);
vi.mock("./FavoriteButton", () => ({ FavoriteButton: () => null }));
