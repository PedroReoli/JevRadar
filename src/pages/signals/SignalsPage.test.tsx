import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import "@/i18n/config";

const { useMarketOverview } = vi.hoisted(() => ({ useMarketOverview: vi.fn() }));

vi.mock("@/features/dashboard/hooks/useMarketOverview", () => ({ useMarketOverview }));

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

function successfulQuery() {
  return {
    data: { signals, snapshots: [], events: [], latestCollection: null },
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  };
}

describe("SignalsPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("filtra sinais pela URL e abre o relatório auditável", async () => {
    useMarketOverview.mockReturnValue(successfulQuery());

    render(
      <MemoryRouter initialEntries={["/signals?direction=negative&confidence=0.7"]}>
        <SignalsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Abrir relatório do sinal de VALE3" })).toHaveAttribute(
      "href",
      "/signals/signal%3Avale3",
    );
    expect(screen.queryByRole("link", { name: "Abrir relatório do sinal de PETR4" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Direção observada"), { target: { value: "all" } });
    expect(await screen.findByRole("link", { name: "Abrir relatório do sinal de PETR4" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Período"), { target: { value: "720" } });
    await waitFor(() => expect(useMarketOverview).toHaveBeenLastCalledWith({
      periodHours: 720,
      assetClass: null,
      minimumConfidence: 0.7,
    }));
  });

  it("expõe retry quando a consulta local falha", () => {
    const refetch = vi.fn();
    useMarketOverview.mockReturnValue({ data: undefined, isPending: false, isError: true, refetch });

    render(
      <MemoryRouter initialEntries={["/signals"]}>
        <SignalsPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(refetch).toHaveBeenCalledOnce();
  });
});
