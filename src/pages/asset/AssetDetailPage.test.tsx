import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import "@/i18n/config";

const { getAssetDetail, getLatestBacktest, getMarketSeries } = vi.hoisted(() => ({
  getAssetDetail: vi.fn(),
  getLatestBacktest: vi.fn(),
  getMarketSeries: vi.fn(),
}));

vi.mock("@/services/marketService", () => ({ getAssetDetail, getMarketSeries }));
vi.mock("@/services/backtestService", () => ({ getLatestBacktest }));

import { AssetDetailPage } from "@/pages/asset/AssetDetailPage";

const asset = {
  id: "asset:b3:PETR4",
  symbol: "PETR4",
  name: "Petrobras PN",
  assetClass: "b3Equity" as const,
  exchange: "B3",
  currency: "BRL",
  countryCode: "BR",
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/assets/asset%3Ab3%3APETR4"]}>
        <Routes>
          <Route element={<AssetDetailPage />} path="/assets/:assetId" />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AssetDetailPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("consulta o read model dedicado antes dos históricos dependentes", async () => {
    getAssetDetail.mockResolvedValue({ asset, snapshot: null, signal: null, events: [] });
    getMarketSeries.mockResolvedValue({ assetId: asset.id, points: [] });
    getLatestBacktest.mockResolvedValue(null);

    renderPage();

    expect(await screen.findByRole("heading", { name: "Detalhes de PETR4", level: 1 })).toBeInTheDocument();
    expect(getAssetDetail).toHaveBeenCalledWith(asset.id, 720);
    await waitFor(() => expect(getMarketSeries).toHaveBeenCalledWith(asset.id, 720));
    expect(getLatestBacktest).toHaveBeenCalledWith(asset.id);
    expect(screen.getByText("Sem sinal calculado")).toBeInTheDocument();
  });

  it("não consulta históricos para ativo ausente", async () => {
    getAssetDetail.mockResolvedValue(null);

    renderPage();

    expect(await screen.findByText("Este ativo não está na watchlist ou não existe no catálogo local.")).toBeInTheDocument();
    expect(getMarketSeries).not.toHaveBeenCalled();
    expect(getLatestBacktest).not.toHaveBeenCalled();
  });

  it("repete a consulta dedicada quando ocorre uma falha local", async () => {
    getAssetDetail.mockRejectedValue(new Error("database_unavailable"));

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Tentar novamente" }));
    await waitFor(() => expect(getAssetDetail).toHaveBeenCalledTimes(2));
  });
});
