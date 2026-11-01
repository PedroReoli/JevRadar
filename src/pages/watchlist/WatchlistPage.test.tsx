import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import "@/i18n/config";

const { listAssets, getDefaultWatchlist, addWatchlistAsset, removeWatchlistAsset } = vi.hoisted(() => ({
  listAssets: vi.fn(),
  getDefaultWatchlist: vi.fn(),
  addWatchlistAsset: vi.fn(),
  removeWatchlistAsset: vi.fn(),
}));

vi.mock("@/services/catalogService", () => ({
  listAssets,
  getDefaultWatchlist,
  addWatchlistAsset,
  removeWatchlistAsset,
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
  it("sincroniza filtros na URL e adiciona um ativo", async () => {
    listAssets.mockResolvedValue([asset]);
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
    await waitFor(() => expect(listAssets).toHaveBeenLastCalledWith("petrobras", undefined));

    fireEvent.click(screen.getByRole("button", { name: "Cripto" }));
    await waitFor(() => expect(listAssets).toHaveBeenLastCalledWith("petrobras", "crypto"));

    fireEvent.click(screen.getByRole("button", { name: "Adicionar" }));
    expect(await screen.findByRole("button", { name: "Remover PETR4 da watchlist" })).toBeInTheDocument();
  });
});
