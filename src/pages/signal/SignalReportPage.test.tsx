import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import "@/i18n/config";

const { getSignalEvidence, getSignalReport } = vi.hoisted(() => ({
  getSignalEvidence: vi.fn(),
  getSignalReport: vi.fn(),
}));

vi.mock("@/services/insightsService", () => ({ getSignalReport }));
vi.mock("@/services/marketService", () => ({ getSignalEvidence }));

import { SignalReportPage } from "@/pages/signal/SignalReportPage";

describe("SignalReportPage", () => {
  it("mostra metodologia, confiança e evidências auditáveis", async () => {
    getSignalReport.mockResolvedValue({
      id: "signal:petr4",
      asset: {
        id: "asset:b3:PETR4",
        symbol: "PETR4",
        name: "Petrobras PN",
        assetClass: "b3Equity",
        exchange: "B3",
        currency: "BRL",
        countryCode: "BR",
      },
      signalScore: 0.42,
      confidence: 0.78,
      sourceCount: 3,
      independentSourceCount: 2,
      evidenceCount: 5,
      hypePenalty: 0.1,
      windowStartedAt: "2026-11-01T00:00:00Z",
      windowEndedAt: "2026-11-01T12:00:00Z",
      methodologyVersion: "weighted-sentiment-v2",
      modelVersion: "jev-latest",
      questionVersion: "document-market-signal-v1",
    });
    getSignalEvidence.mockResolvedValue([]);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/signals/signal%3Apetr4"]}>
          <Routes>
            <Route element={<SignalReportPage />} path="/signals/:signalId" />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Sinal de PETR4" })).toBeInTheDocument();
    expect(screen.getByText("weighted-sentiment-v2")).toBeInTheDocument();
    expect(screen.getByText("jev-latest")).toBeInTheDocument();
    expect(screen.getByText("78%")).toBeInTheDocument();
    expect(screen.queryByText(/comprar|vender/i)).not.toBeInTheDocument();
  });
});
