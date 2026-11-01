import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@tauri-apps/api/core", () => ({
  invoke,
  isTauri: () => true,
}));

import { exportMarketReport } from "@/services/reportService";

describe("reportService", () => {
  beforeEach(() => invoke.mockReset());

  it("exporta um relatório versionado com filtros limitados", async () => {
    invoke.mockResolvedValueOnce({
      contractVersion: "market-report-v1",
      generatedAt: "2026-11-01T15:00:00Z",
      directoryPath: "C:\\Users\\Pedro\\Downloads\\JevRadar-report",
      markdownPath: "C:\\Users\\Pedro\\Downloads\\JevRadar-report\\report.md",
      jsonPath: "C:\\Users\\Pedro\\Downloads\\JevRadar-report\\evidence.json",
      signalCount: 3,
      eventCount: 4,
      relationCount: 2,
      backtestCount: 1,
    });

    const result = await exportMarketReport({
      periodHours: 168,
      minimumConfidence: 0.65,
      language: "pt-BR",
    });

    expect(result.contractVersion).toBe("market-report-v1");
    expect(invoke).toHaveBeenCalledWith("export_market_report", {
      request: { periodHours: 168, minimumConfidence: 0.65, language: "pt-BR" },
    });
  });

  it("rejeita filtros fora do contrato antes de invocar o core", async () => {
    await expect(exportMarketReport({
      periodHours: 0,
      minimumConfidence: 0.5,
      language: "pt-BR",
    })).rejects.toThrow();
    expect(invoke).not.toHaveBeenCalled();
  });
});
