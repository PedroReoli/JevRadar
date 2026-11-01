import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import "@/i18n/config";

const {
  exportLocalData,
  exportMarketReport,
  getReportOverview,
} = vi.hoisted(() => ({
  exportLocalData: vi.fn(),
  exportMarketReport: vi.fn(),
  getReportOverview: vi.fn(),
}));

vi.mock("@/services/dataManagementService", () => ({ exportLocalData, purgeLocalData: vi.fn() }));
vi.mock("@/services/reportService", () => ({ exportMarketReport, getReportOverview }));

import { ReportsPage } from "@/pages/reports/ReportsPage";

function LocationProbe() {
  return <output data-testid="location-search">{useLocation().search}</output>;
}

describe("ReportsPage", () => {
  it("gera um relatório de mercado com o recorte escolhido", async () => {
    getReportOverview.mockResolvedValue({
      signalCount: 120,
      alertCount: 14,
      collectionCount: 32,
      backtestCount: 7,
      versions: {
        signalMethodologyVersions: ["weighted-sentiment-v2"],
        backtestMethodologyVersions: ["positive-turn-forward-return-v1"],
        modelVersions: ["jev-latest"],
        questionVersions: ["document-market-signal-v1"],
      },
      recentBacktests: [],
    });
    exportMarketReport.mockResolvedValue({
      contractVersion: "market-report-v1",
      generatedAt: "2026-11-01T15:00:00Z",
      directoryPath: "C:\\Reports\\JevRadar-report",
      markdownPath: "C:\\Reports\\JevRadar-report\\report.md",
      jsonPath: "C:\\Reports\\JevRadar-report\\evidence.json",
      signalCount: 2,
      eventCount: 3,
      relationCount: 1,
      backtestCount: 4,
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter><ReportsPage /><LocationProbe /></MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("120")).toBeInTheDocument();
    expect(screen.getByText("weighted-sentiment-v2")).toBeInTheDocument();

    fireEvent.change(await screen.findByLabelText("Período observado"), { target: { value: "720" } });
    fireEvent.change(screen.getByLabelText("Confiança mínima"), { target: { value: "0.8" } });
    expect(screen.getByTestId("location-search")).toHaveTextContent("period=720");
    expect(screen.getByTestId("location-search")).toHaveTextContent("confidence=0.8");
    fireEvent.click(screen.getByRole("button", { name: "Exportar relatório de mercado" }));

    await waitFor(() => {
      expect(exportMarketReport.mock.calls[0]?.[0]).toEqual({
        periodHours: 720,
        minimumConfidence: 0.8,
        language: "pt-BR",
      });
    });
    expect(await screen.findByText("2 sinais, 3 eventos, 1 relações e 4 backtests")).toBeInTheDocument();
    expect(screen.getByText("C:\\Reports\\JevRadar-report\\evidence.json")).toBeInTheDocument();
  });
});
