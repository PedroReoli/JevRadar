import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import "@/i18n/config";

const marketMocks = vi.hoisted(() => ({
  getMarketOverview: vi.fn(),
  getMarketSeries: vi.fn(),
  getSignalEvidence: vi.fn(),
  refreshMarketData: vi.fn(),
}));
const systemMocks = vi.hoisted(() => ({ getSystemStatus: vi.fn() }));
const settingsMocks = vi.hoisted(() => ({ getAppSettings: vi.fn() }));

vi.mock("@/services/marketService", () => marketMocks);
vi.mock("@/services/systemService", () => systemMocks);
vi.mock("@/services/settingsService", () => settingsMocks);

import { DashboardPage } from "@/pages/dashboard/DashboardPage";

const asset = {
  id: "asset:crypto:BTC",
  symbol: "BTC",
  name: "Bitcoin",
  assetClass: "crypto",
  exchange: "CRYPTO",
  currency: "USD",
  countryCode: null,
};

const signal = {
  id: "signal:btc:1",
  asset,
  signalScore: 0.64,
  confidence: 0.78,
  sourceCount: 3,
  independentSourceCount: 2,
  evidenceCount: 8,
  hypePenalty: 0.12,
  windowStartedAt: "2026-10-31T12:00:00Z",
  windowEndedAt: "2026-11-01T12:00:00Z",
  methodologyVersion: "weighted-sentiment-v2",
  modelVersion: "jev-v1",
  questionVersion: "questions-v1",
};

function renderDashboard(route = "/dashboard") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <Routes><Route path="/dashboard" element={<DashboardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function prepareSharedQueries() {
  systemMocks.getSystemStatus.mockResolvedValue({
    runtime: "tauri",
    version: "0.2.0-alpha.22",
    database: "ready",
    backgroundCollection: "ready",
    localApi: "disabled",
  });
  settingsMocks.getAppSettings.mockResolvedValue({
    experienceLevel: "intermediate",
    investmentRange: "upTo5k",
  });
  marketMocks.getMarketSeries.mockResolvedValue({
    assetId: asset.id,
    points: [{ observedAt: "2026-11-01T12:00:00Z", closeValue: 77918.01, signalScore: 0.64, confidence: 0.78 }],
  });
  marketMocks.getSignalEvidence.mockResolvedValue([{
    classificationId: "classification:1",
    sourceName: "Agência Brasil",
    title: "Documento principal",
    excerpt: "Trecho rastreável.",
    canonicalUrl: "https://example.com/documento",
    publishedAt: "2026-11-01T11:00:00Z",
    sentiment: "optimistic",
    sentimentProbability: 0.8,
    relevanceExpected: 2.4,
    contentType: "news",
    hypeProbability: 0.1,
    factualClaimProbability: 0.9,
    confidence: 0.82,
    contributionWeight: 0.7,
    relevanceWeight: 0.8,
    contentTypeWeight: 1,
    factualWeight: 0.9,
    sourceCredibility: 0.85,
    diversityFactor: 1,
    recencyFactor: 0.95,
    hypeFactor: 0.9,
    confidenceFactor: 0.82,
    modelVersion: "jev-v1",
    questionVersion: "questions-v1",
  }]);
  marketMocks.refreshMarketData.mockResolvedValue({
    runId: "collection:2",
    status: "completed",
    storedObservationCount: 1,
    sourceErrorCount: 0,
    sources: [],
  });
}

describe("DashboardPage", () => {
  beforeEach(() => {
    Object.values(marketMocks).forEach((mock) => mock.mockReset());
    systemMocks.getSystemStatus.mockReset();
    settingsMocks.getAppSettings.mockReset();
    prepareSharedQueries();
  });

  it("orquestra filtros da URL, série, sinal, evidências e atualização", async () => {
    marketMocks.getMarketOverview.mockResolvedValue({
      snapshots: [{
        asset,
        closeValue: 77918.01,
        previousCloseValue: 77582.02,
        changePercent: 0.43,
        observedAt: "2026-11-01T12:00:00Z",
        sourceName: "Binance Public API",
        interval: "1d",
      }],
      signals: [signal],
      events: [],
      latestCollection: {
        runId: "collection:1",
        status: "completed",
        startedAt: "2026-11-01T11:59:00Z",
        completedAt: "2026-11-01T12:00:00Z",
        storedObservationCount: 1,
        sourceErrorCount: 0,
      },
    });

    renderDashboard("/dashboard?period=168&class=crypto&confidence=0.7&asset=asset%3Acrypto%3ABTC&signal=signal%3Abtc%3A1");

    expect(await screen.findByRole("heading", { name: "Radar de mercado" })).toBeInTheDocument();
    expect(await screen.findByText("Documento principal")).toBeInTheDocument();
    expect(marketMocks.getMarketOverview).toHaveBeenCalledWith({
      periodHours: 168,
      assetClass: "crypto",
      minimumConfidence: 0.7,
    });
    expect(marketMocks.getMarketSeries).toHaveBeenCalledWith(asset.id, 168);
    expect(marketMocks.getSignalEvidence).toHaveBeenCalledWith(signal.id);

    fireEvent.click(screen.getByRole("button", { name: "Atualizar dados" }));
    await waitFor(() => expect(marketMocks.refreshMarketData).toHaveBeenCalledOnce());
  });

  it("distingue falha do banco de um recorte ainda sem observações", async () => {
    marketMocks.getMarketOverview.mockRejectedValueOnce(new Error("database_unavailable"));
    const failed = renderDashboard();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível ler as observações de mercado do banco local.");
    failed.unmount();

    marketMocks.getMarketOverview.mockResolvedValueOnce({
      snapshots: [{ asset, closeValue: null, previousCloseValue: null, changePercent: null, observedAt: null, sourceName: null, interval: null }],
      signals: [],
      events: [],
      latestCollection: null,
    });
    renderDashboard();
    expect(await screen.findByRole("heading", { name: "Nenhum sinal processado ainda" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir configurações" })).toHaveAttribute("href", "/getting-started");
  });
});
