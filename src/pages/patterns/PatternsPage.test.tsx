import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import "@/i18n/config";

const { listHistoricalPatterns } = vi.hoisted(() => ({ listHistoricalPatterns: vi.fn() }));
vi.mock("@/services/patternService", () => ({ listHistoricalPatterns }));

import { PatternsPage } from "@/pages/patterns/PatternsPage";

function renderPage(initialEntry = "/patterns") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={[initialEntry]}><PatternsPage /></MemoryRouter></QueryClientProvider>);
}

describe("PatternsPage", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it("compara sinais semelhantes com baseline e incerteza", async () => {
    listHistoricalPatterns.mockResolvedValue({
      items: [{ runId: "backtest:petrobras", asset: { id: "asset:b3:PETR4", symbol: "PETR4", name: "Petrobras PN", assetClass: "b3Equity", exchange: "B3", currency: "BRL", countryCode: "BR" }, horizonDays: 7, sampleSize: 18, meanReturn: 0.03, medianReturn: 0.02, positiveRate: 0.66, baselinePositiveRate: 0.51, baselineDifference: 0.15, confidenceIntervalLow: 0.43, confidenceIntervalHigh: 0.83, signalThreshold: 0.15, confidenceThreshold: 0.6, methodologyVersion: "positive-turn-forward-return-v1", signalMethodologyVersion: "weighted-sentiment-v2", modelVersion: "jev-latest", questionVersion: "document-market-signal-v2", evaluationStartedAt: "2026-01-01T00:00:00Z", evaluationEndedAt: "2026-10-01T00:00:00Z", createdAt: "2026-11-01T00:00:00Z" }],
      page: 1, pageSize: 25, totalItems: 1, totalPages: 1, methodologyVersion: "latest-comparable-backtests-v1",
    });
    renderPage("/patterns?class=b3Equity&outcome=outperformed&sample=10");
    expect(await screen.findByRole("link", { name: "PETR4" })).toHaveAttribute("href", "/assets/asset%3Ab3%3APETR4");
    expect(screen.getByText(/não prevê repetição/i)).toBeInTheDocument();
    expect(listHistoricalPatterns).toHaveBeenCalledWith(expect.objectContaining({ assetClass: "b3Equity", outcome: "outperformed", minimumSampleSize: 10 }));
    fireEvent.change(screen.getByRole("combobox", { name: "Horizonte" }), { target: { value: "30" } });
    await waitFor(() => expect(listHistoricalPatterns).toHaveBeenLastCalledWith(expect.objectContaining({ horizonDays: 30 })));
  });

  it("não inventa padrões sem backtests concluídos", async () => {
    listHistoricalPatterns.mockResolvedValue({ items: [], page: 1, pageSize: 25, totalItems: 0, totalPages: 1, methodologyVersion: "latest-comparable-backtests-v1" });
    renderPage();
    expect(await screen.findByText("Nenhum backtest comparável corresponde aos filtros atuais.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
