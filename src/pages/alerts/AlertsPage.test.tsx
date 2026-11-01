import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import "@/i18n/config";

const { listAlertHistory } = vi.hoisted(() => ({ listAlertHistory: vi.fn() }));

vi.mock("@/services/insightsService", () => ({ listAlertHistory }));

import { AlertsPage } from "@/pages/alerts/AlertsPage";

describe("AlertsPage", () => {
  it("filtra alertas pela URL sem transformar sinais em recomendação", async () => {
    listAlertHistory.mockResolvedValue([
      {
        signalId: "signal:petr4",
        alertLevel: 3,
        deliveredAt: "2026-11-01T12:00:00Z",
        asset: {
          id: "asset:b3:PETR4",
          symbol: "PETR4",
          name: "Petrobras PN",
          assetClass: "b3Equity",
          exchange: "B3",
          currency: "BRL",
          countryCode: "BR",
        },
        signalScore: 0.64,
        confidence: 0.82,
        evidenceCount: 9,
        independentSourceCount: 4,
      },
      {
        signalId: "signal:btc",
        alertLevel: 1,
        deliveredAt: "2026-11-01T11:00:00Z",
        asset: {
          id: "asset:crypto:BTC",
          symbol: "BTC",
          name: "Bitcoin",
          assetClass: "crypto",
          exchange: "Binance",
          currency: "USDT",
          countryCode: null,
        },
        signalScore: -0.2,
        confidence: 0.66,
        evidenceCount: 3,
        independentSourceCount: 2,
      },
    ]);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/alerts"]}>
          <AlertsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("heading", { name: /PETR4/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /BTC/ })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Nível"), { target: { value: "3" } });
    expect(screen.getByRole("heading", { name: /PETR4/ })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /BTC/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/comprar|vender/i)).not.toBeInTheDocument();
  });
});
