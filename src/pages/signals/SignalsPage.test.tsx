import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import "@/i18n/config";

const { getSignalExplorer } = vi.hoisted(() => ({ getSignalExplorer: vi.fn() }));

vi.mock("@/services/signalService", () => ({ getSignalExplorer }));

import { SignalsPage } from "@/pages/signals/SignalsPage";

const baseSignal = {
  confidence: 0.8,
  sourceCount: 4,
  independentSourceCount: 3,
  evidenceCount: 6,
  hypePenalty: 0.1,
  windowStartedAt: "2026-11-01T10:00:00Z",
  windowEndedAt: "2026-11-01T11:00:00Z",
  methodologyVersion: "signal-v1",
  modelVersion: "jev-v1",
  questionVersion: "questions-v1",
};

const signals = [
  {
    ...baseSignal,
    id: "signal:petr4",
    asset: { id: "asset:b3:PETR4", symbol: "PETR4", name: "Petrobras PN", assetClass: "b3Equity" as const, exchange: "B3", currency: "BRL", countryCode: "BR" },
    signalScore: 0.62,
  },
  {
    ...baseSignal,
    id: "signal:vale3",
    asset: { id: "asset:b3:VALE3", symbol: "VALE3", name: "Vale ON", assetClass: "b3Equity" as const, exchange: "B3", currency: "BRL", countryCode: "BR" },
    signalScore: -0.48,
    confidence: 0.9,
  },
];

function renderPage(initialEntry = "/signals") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <SignalsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("SignalsPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("consulta sinais pelos filtros da URL e abre o relatório auditável", async () => {
    getSignalExplorer.mockImplementation(async (filter) => {
      const selected = filter.direction === "negative" ? [signals[1]!] : signals;
      return {
        signals: selected,
        assets: signals.map((signal) => signal.asset),
        summary: {
          total: selected.length,
          positive: selected.filter((signal) => signal.signalScore >= 0.15).length,
          neutral: 0,
          negative: selected.filter((signal) => signal.signalScore <= -0.15).length,
        },
      };
    });

    renderPage("/signals?direction=negative&confidence=0.7");

    expect(await screen.findByRole("link", { name: "Abrir relatório do sinal de VALE3" })).toHaveAttribute(
      "href",
      "/signals/signal%3Avale3",
    );
    expect(screen.queryByRole("link", { name: "Abrir relatório do sinal de PETR4" })).not.toBeInTheDocument();
    expect(getSignalExplorer).toHaveBeenCalledWith({
      periodHours: 24,
      minimumConfidence: 0.7,
      direction: "negative",
      assetId: null,
    });

    fireEvent.change(screen.getByLabelText("Direção observada"), { target: { value: "all" } });
    expect(await screen.findByRole("link", { name: "Abrir relatório do sinal de PETR4" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Período"), { target: { value: "720" } });
    await waitFor(() => expect(getSignalExplorer).toHaveBeenLastCalledWith({
      periodHours: 720,
      minimumConfidence: 0.7,
      direction: null,
      assetId: null,
    }));
  });

  it("expõe retry quando a consulta local falha", async () => {
    getSignalExplorer.mockRejectedValue(new Error("database_unavailable"));
    renderPage();

    const retry = await screen.findByRole("button", { name: "Tentar novamente" });
    fireEvent.click(retry);
    await waitFor(() => expect(getSignalExplorer).toHaveBeenCalledTimes(2));
  });
});
