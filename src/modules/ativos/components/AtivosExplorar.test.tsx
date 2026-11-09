import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { AtivosExplorar } from "./AtivosExplorar";
import { AtivosPage } from "./AtivosPage";
import { useExploreMemory } from "../hooks/useExploreMemory";

const searchPage = vi.hoisted(() => vi.fn());
vi.mock("../../portfolio/services/positionService", () => ({
  positionService: { searchAssetsPage: searchPage },
}));
vi.mock("../../portfolio/hooks/useAssetSearch", () => ({
  useAssetSearch: () => ({
    data: [],
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));
vi.mock("../../assets/components/AtivoDetailPage", () => ({
  AtivoDetailPage: () => <h3>Resumo dentro de Ativos</h3>,
}));
vi.mock("../../assets/hooks/useAssetDetail", () => ({
  useAssetDetail: (ticker: string) => ({
    data: ticker
      ? {
          ticker,
          name: `Ativo ${ticker.slice(3)}`,
          type: "stock_br",
          currency: "BRL",
        }
      : undefined,
  }),
}));

beforeEach(() => {
  localStorage.clear();
  useExploreMemory.setState({ entries: {} });
  searchPage.mockReset();
  searchPage.mockImplementation(async (_term: string, page: number) =>
    page === 0
      ? Array.from({ length: 25 }, (_, index) => ({
          ticker: `AAA${index}`,
          name: `Ativo ${index}`,
          type: "stock_br",
          currency: "BRL",
        }))
      : [
          {
            ticker: "BBB1",
            name: "Outro ativo",
            type: "stock_br",
            currency: "BRL",
          },
        ],
  );
});

function show(initialEntry = "/ativos/explorar?q=AAA") {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/ativos" element={<AtivosPage />}>
            <Route path="posicoes" element={<p>Minhas posições</p>} />
            <Route path="explorar" element={<AtivosExplorar />} />
            <Route path="explorar/:ticker" element={<AtivosExplorar />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

it("usa somente a busca superior e pagina os resultados", async () => {
  const user = userEvent.setup();
  show();
  const input = await screen.findByRole("searchbox", {
    name: "Buscar ativo por nome ou ticker",
  });
  expect(screen.getAllByRole("searchbox")).toHaveLength(1);
  expect(input).toHaveValue("AAA");
  expect(input).not.toHaveFocus();
  expect(
    await screen.findByRole("link", { name: /AAA0 Ativo 0/ }),
  ).toBeInTheDocument();
  expect(
    within(
      screen.getByRole("list", { name: "Resultados do catálogo" }),
    ).getAllByRole("listitem"),
  ).toHaveLength(24);
  await user.click(screen.getByRole("button", { name: "Próxima" }));
  expect(
    await screen.findByRole("link", { name: /BBB1 Outro ativo/ }),
  ).toBeInTheDocument();
  expect(searchPage).toHaveBeenCalledWith("AAA", 1, 24);
  await user.clear(input);
  await user.type(input, "PETR4");
  await waitFor(() => expect(searchPage).toHaveBeenCalledWith("PETR4", 0, 24));
});

it("mantém o detalhe em Ativos e a guia Explorar volta aos resultados", async () => {
  const user = userEvent.setup();
  show();
  const result = await screen.findByRole("link", { name: /AAA0 Ativo 0/ });
  expect(result).toHaveAttribute("href", "/ativos/explorar/AAA0?q=AAA");
  await user.click(result);
  expect(screen.getByRole("heading", { name: "Ativos" })).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Resumo dentro de Ativos" }),
  ).toBeInTheDocument();
  const tab = screen.getByRole("tab", { name: "Explorar" });
  expect(tab).toHaveAttribute("aria-selected", "true");
  expect(tab).toHaveAttribute("href", "/ativos/explorar?q=AAA");
  expect(tab.querySelector('span[aria-hidden="true"]')).not.toBeNull();
  await user.click(tab);
  expect(
    await screen.findByRole("link", { name: /AAA0 Ativo 0/ }),
  ).toBeInTheDocument();
});

it("retoma o ativo após trocar de guia e mostra recentes depois de limpar a busca", async () => {
  const user = userEvent.setup();
  const view = show();
  await user.click(await screen.findByRole("link", { name: /AAA0 Ativo 0/ }));
  expect(
    useExploreMemory.getState().entries.guest.recentAssets[0]?.ticker,
  ).toBe("AAA0");
  await user.click(screen.getByRole("tab", { name: "Posições" }));
  expect(screen.getByText("Minhas posições")).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Explorar" })).toHaveAttribute(
    "href",
    "/ativos/explorar/AAA0?q=AAA",
  );
  await user.click(screen.getByRole("tab", { name: "Explorar" }));
  expect(
    screen.getByRole("heading", { name: "Resumo dentro de Ativos" }),
  ).toBeInTheDocument();
  const input = screen.getByRole("searchbox", {
    name: "Buscar ativo por nome ou ticker",
  });
  expect(input).toHaveValue("AAA");
  await user.clear(input);
  await waitFor(() =>
    expect(screen.getByRole("tab", { name: "Explorar" })).toHaveAttribute(
      "href",
      "/ativos/explorar",
    ),
  );
  await waitFor(() =>
    expect(
      screen.getByRole("list", { name: "Ativos vistos recentemente" }),
    ).toBeInTheDocument(),
  );
  const recent = screen.getByRole("link", { name: /AAA0 Ativo 0/ });
  expect(recent).toHaveAttribute("href", "/ativos/explorar/AAA0?q=AAA0");
  await user.click(recent);
  expect(
    screen.getByRole("heading", { name: "Resumo dentro de Ativos" }),
  ).toBeInTheDocument();
  view.unmount();
  show("/ativos/posicoes");
  expect(screen.getByRole("tab", { name: "Explorar" })).toHaveAttribute(
    "href",
    "/ativos/explorar/AAA0?q=AAA0",
  );
  await user.click(screen.getByRole("tab", { name: "Explorar" }));
  expect(
    screen.getByRole("heading", { name: "Resumo dentro de Ativos" }),
  ).toBeInTheDocument();
});
