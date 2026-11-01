import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import "@/i18n/config";

const { getCalibrationReadiness } = vi.hoisted(() => ({ getCalibrationReadiness: vi.fn() }));
vi.mock("@/services/calibrationService", () => ({ getCalibrationReadiness }));

import { CalibrationPage } from "@/pages/calibration/CalibrationPage";

const asset = { id: "asset:b3:PETR4", symbol: "PETR4", name: "Petrobras PN", assetClass: "b3Equity" as const, exchange: "B3", currency: "BRL", countryCode: "BR" };

function renderPage(initialEntry = "/calibration") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={[initialEntry]}><CalibrationPage /></MemoryRouter></QueryClientProvider>);
}

describe("CalibrationPage", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it("expõe prontidão sem confundir o critério com validade preditiva", async () => {
    getCalibrationReadiness.mockResolvedValue({
      generatedAt: "2026-11-01T00:00:00Z",
      targetObservationDays: 30,
      watchlistAssetCount: 1,
      assetsWithSignals: 1,
      assetsWithPrices: 1,
      assetsWithCompletedBacktests: 1,
      items: [{ asset, signalCount: 20, priceObservationCount: 31, firstObservedAt: "2026-10-01T00:00:00Z", lastObservedAt: "2026-10-31T00:00:00Z", observedDays: 31, latestCompletedBacktestAt: "2026-11-01T00:00:00Z", sampleSize1d: 12, sampleSize7d: 11, sampleSize30d: 9 }],
    });
    renderPage("/calibration?sample=10");
    expect(await screen.findByText("Em coleta")).toBeInTheDocument();
    expect(screen.getByText("Amostra abaixo do limiar em algum horizonte")).toBeInTheDocument();
    expect(screen.getByText(/não significa poder preditivo/i)).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Prontidão de PETR4: 80%" })).toHaveAttribute("aria-valuenow", "80");
    fireEvent.change(screen.getByRole("combobox", { name: "Amostra mínima por horizonte" }), { target: { value: "5" } });
    await waitFor(() => expect(screen.getByText("Critério atendido")).toBeInTheDocument());
  });

  it("não cria indicadores quando a watchlist está vazia", async () => {
    getCalibrationReadiness.mockResolvedValue({ generatedAt: "2026-11-01T00:00:00Z", targetObservationDays: 30, watchlistAssetCount: 0, assetsWithSignals: 0, assetsWithPrices: 0, assetsWithCompletedBacktests: 0, items: [] });
    renderPage();
    expect(await screen.findByText("Adicione ativos à watchlist para acompanhar a prontidão da coleta.")).toBeInTheDocument();
    expect(screen.queryByText("Evidência disponível por ativo")).not.toBeInTheDocument();
  });
});
