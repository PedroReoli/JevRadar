import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import "@/i18n/config";

const { getDefaultWatchlist, getMarketOverview } = vi.hoisted(() => ({ getDefaultWatchlist: vi.fn(), getMarketOverview: vi.fn() }));
vi.mock("@/services/catalogService", () => ({ getDefaultWatchlist }));
vi.mock("@/services/marketService", () => ({ getMarketOverview }));

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
    getDefaultWatchlist.mockResolvedValue({ id: "watchlist:default", name: "Principal", limit: 50, assets: assets.map((asset) => ({ asset, enabled: true, addedAt: "2026-11-01T00:00:00Z" })) });
    getMarketOverview.mockResolvedValue({
      snapshots: [{ asset: assets[0], closeValue: 42, previousCloseValue: 40, changePercent: 5, observedAt: "2026-11-01T12:00:00Z", sourceName: "brapi", interval: "1d" }],
      signals: [
        { id: "signal:petr4", asset: assets[0], signalScore: 0.62, confidence: 0.8, sourceCount: 4, independentSourceCount: 3, evidenceCount: 6, hypePenalty: 0.1, windowStartedAt: "2026-10-31T00:00:00Z", windowEndedAt: "2026-11-01T00:00:00Z", methodologyVersion: "weighted-sentiment-v1", modelVersion: "jev", questionVersion: "v1" },
        { id: "signal:vale3", asset: assets[1], signalScore: -0.35, confidence: 0.72, sourceCount: 3, independentSourceCount: 2, evidenceCount: 4, hypePenalty: 0.2, windowStartedAt: "2026-10-31T00:00:00Z", windowEndedAt: "2026-11-01T00:00:00Z", methodologyVersion: "weighted-sentiment-v1", modelVersion: "jev", questionVersion: "v1" },
      ],
      events: [{ id: "event:1", title: "Evento", observedFact: "Fato", eventType: "economic", countryCode: "BR", startedAt: "2026-11-01T00:00:00Z", asset: assets[0], relationType: "known", confidence: 0.8, rationaleTemplateKey: "event.economic.known", sourceName: "Fonte", sourceUrl: null }],
      latestCollection: null,
    });
    renderPage("/compare?assets=asset%3Ab3%3APETR4%2Casset%3Ab3%3AVALE3&period=720&confidence=0.7");
    expect(await screen.findByText("Intensidade do sentimento")).toBeInTheDocument();
    expect(screen.getByText("Variação de preço observada")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir detalhes de PETR4" })).toHaveAttribute("href", "/assets/asset%3Ab3%3APETR4");
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    expect(getMarketOverview).toHaveBeenCalledWith({ periodHours: 720, assetClass: null, minimumConfidence: 0.7 });
  });

  it("limita a seleção a quatro ativos", async () => {
    getDefaultWatchlist.mockResolvedValue({ id: "watchlist:default", name: "Principal", limit: 50, assets: assets.map((asset) => ({ asset, enabled: true, addedAt: "2026-11-01T00:00:00Z" })) });
    getMarketOverview.mockResolvedValue({ snapshots: [], signals: [], events: [], latestCollection: null });
    renderPage("/compare?assets=asset%3Ab3%3APETR4%2Casset%3Ab3%3AVALE3%2Casset%3Acrypto%3ABTC%2Casset%3Aus%3AAAPL");
    expect(await screen.findByText("4/4 selecionados")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /MSFT/ })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: /PETR4/ })).not.toBeDisabled();
  });

  it("orienta o usuário quando a watchlist está vazia", async () => {
    getDefaultWatchlist.mockResolvedValue({ id: "watchlist:default", name: "Principal", limit: 50, assets: [] });
    getMarketOverview.mockResolvedValue({ snapshots: [], signals: [], events: [], latestCollection: null });
    renderPage("/compare");
    expect(await screen.findByText("Adicione ativos à watchlist antes de iniciar uma comparação.")).toBeInTheDocument();
    expect(screen.queryByText("Ativos e recorte")).not.toBeInTheDocument();
  });
});
