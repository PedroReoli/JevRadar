import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import "@/i18n/config";

const { getAssetComparison } = vi.hoisted(() => ({ getAssetComparison: vi.fn() }));
vi.mock("@/services/comparisonService", () => ({ getAssetComparison }));

import { ComparisonPage } from "@/pages/comparison/ComparisonPage";

const assets = [
  { id: "asset:b3:PETR4", symbol: "PETR4", name: "Petrobras PN", assetClass: "b3Equity" as const, exchange: "B3", currency: "BRL", countryCode: "BR" },
  { id: "asset:b3:VALE3", symbol: "VALE3", name: "Vale ON", assetClass: "b3Equity" as const, exchange: "B3", currency: "BRL", countryCode: "BR" },
  { id: "asset:crypto:BTC", symbol: "BTC", name: "Bitcoin", assetClass: "crypto" as const, exchange: "CRYPTO", currency: "USD", countryCode: null },
  { id: "asset:us:AAPL", symbol: "AAPL", name: "Apple", assetClass: "usEquity" as const, exchange: "NASDAQ", currency: "USD", countryCode: "US" },
  { id: "asset:us:MSFT", symbol: "MSFT", name: "Microsoft", assetClass: "usEquity" as const, exchange: "NASDAQ", currency: "USD", countryCode: "US" },
];

function renderPage(initialEntry: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={[initialEntry]}><ComparisonPage /></MemoryRouter></QueryClientProvider>);
}

describe("ComparisonPage", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it("compara escalas separadas e preserva dados ausentes", async () => {
    getAssetComparison.mockResolvedValue({
      availableAssets: assets,
      rows: [
        { asset: assets[0], changePercent: 5, signalScore: 0.62, confidence: 0.8, evidenceCount: 6, independentSourceCount: 3, hypePenalty: 0.1, eventCount: 1, observedAt: "2026-11-01T12:00:00Z", marketSourceName: "brapi" },
        { asset: assets[1], changePercent: null, signalScore: -0.35, confidence: 0.72, evidenceCount: 4, independentSourceCount: 2, hypePenalty: 0.2, eventCount: 0, observedAt: null, marketSourceName: null },
      ],
    });
    renderPage("/compare?assets=asset%3Ab3%3APETR4%2Casset%3Ab3%3AVALE3&period=720&confidence=0.7");
    expect(await screen.findByText("Intensidade do sentimento")).toBeInTheDocument();
    expect(screen.getByText("Variação de preço observada")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir detalhes de PETR4" })).toHaveAttribute("href", "/assets/asset%3Ab3%3APETR4");
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    expect(getAssetComparison).toHaveBeenCalledWith({
      assetIds: ["asset:b3:PETR4", "asset:b3:VALE3"],
      periodHours: 720,
      minimumConfidence: 0.7,
    });
  });

  it("limita a seleção a quatro ativos", async () => {
    getAssetComparison.mockResolvedValue({ availableAssets: assets, rows: [] });
    renderPage("/compare?assets=asset%3Ab3%3APETR4%2Casset%3Ab3%3AVALE3%2Casset%3Acrypto%3ABTC%2Casset%3Aus%3AAAPL");
    expect(await screen.findByText("4/4 selecionados")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /MSFT/ })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: /PETR4/ })).not.toBeDisabled();
  });

  it("orienta o usuário quando a watchlist está vazia", async () => {
    getAssetComparison.mockResolvedValue({ availableAssets: [], rows: [] });
    renderPage("/compare");
    expect(await screen.findByText("Adicione ativos à watchlist antes de iniciar uma comparação.")).toBeInTheDocument();
    expect(screen.queryByText("Ativos e recorte")).not.toBeInTheDocument();
  });

  it("permite repetir a consulta quando o banco local falha", async () => {
    getAssetComparison.mockRejectedValue(new Error("database_unavailable"));
    renderPage("/compare");

    fireEvent.click(await screen.findByRole("button", { name: "Tentar novamente" }));
    await waitFor(() => expect(getAssetComparison).toHaveBeenCalledTimes(2));
  });
});
