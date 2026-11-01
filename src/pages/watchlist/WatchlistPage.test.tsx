import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import "@/i18n/config";

const { listAssets, getDefaultWatchlist, addWatchlistAsset, removeWatchlistAsset, refreshAssetCatalog } = vi.hoisted(() => ({
  listAssets: vi.fn(),
  getDefaultWatchlist: vi.fn(),
  addWatchlistAsset: vi.fn(),
  removeWatchlistAsset: vi.fn(),
  refreshAssetCatalog: vi.fn(),
}));

vi.mock("@/services/catalogService", () => ({
  listAssets,
  getDefaultWatchlist,
  addWatchlistAsset,
  removeWatchlistAsset,
  refreshAssetCatalog,
}));

import { WatchlistPage } from "@/pages/watchlist/WatchlistPage";

const asset = {
  id: "asset:b3:PETR4",
  symbol: "PETR4",
  name: "Petrobras PN",
  assetClass: "b3Equity" as const,
  exchange: "B3",
  currency: "BRL",
  countryCode: "BR",
};

describe("WatchlistPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("sincroniza filtros na URL e adiciona um ativo", async () => {
    listAssets.mockResolvedValue({ items: [asset], page: 1, pageSize: 50, totalItems: 1, totalPages: 1 });
    getDefaultWatchlist.mockResolvedValue({
      id: "watchlist:default",
      name: "Principal",
      limit: 50,
      assets: [],
    });
    addWatchlistAsset.mockResolvedValue({
      id: "watchlist:default",
      name: "Principal",
      limit: 50,
      assets: [{ asset, enabled: true, addedAt: "2026-11-01 00:00:00" }],
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/watchlist"]}>
          <WatchlistPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("PETR4")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar ativos" }), {
      target: { value: "petrobras" },
    });
    await waitFor(() => expect(listAssets).toHaveBeenLastCalledWith("petrobras", undefined, 1));

    fireEvent.click(screen.getByRole("button", { name: "Cripto" }));
    await waitFor(() => expect(listAssets).toHaveBeenLastCalledWith("petrobras", "crypto", 1));

    fireEvent.click(screen.getByRole("button", { name: "Adicionar" }));
    expect(await screen.findByRole("button", { name: "Remover PETR4 da watchlist" })).toBeInTheDocument();
  });

  it("consulta somente a página pedida e navega pelo catálogo", async () => {
    listAssets
      .mockResolvedValueOnce({ items: [asset], page: 1, pageSize: 50, totalItems: 51, totalPages: 2 })
      .mockResolvedValueOnce({ items: [{ ...asset, id: "asset:b3:VALE3", symbol: "VALE3", name: "Vale ON" }], page: 2, pageSize: 50, totalItems: 51, totalPages: 2 });
    getDefaultWatchlist.mockResolvedValue({ id: "watchlist:default", name: "Principal", limit: 50, assets: [] });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/watchlist"]}>
          <WatchlistPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Exibindo 1–50 de 51 ativos")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Próxima página" }));
    await waitFor(() => expect(listAssets).toHaveBeenLastCalledWith("", undefined, 2));
    expect(await screen.findByText("VALE3")).toBeInTheDocument();
    expect(screen.queryByText("PETR4")).not.toBeInTheDocument();
  });
});
