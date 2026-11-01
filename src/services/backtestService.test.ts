import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke, isTauri: () => true }));

import { getLatestBacktest, runBacktest } from "@/services/backtestService";

const report = {
  runId: "backtest:1",
  asset: { id: "asset:b3:PETR4", symbol: "PETR4", name: "Petrobras PN", assetClass: "b3Equity", exchange: "B3", currency: "BRL", countryCode: "BR" },
  methodologyVersion: "positive-turn-forward-return-v1",
  signalMethodologyVersion: "weighted-sentiment-v2",
  modelVersion: "jev-latest",
  questionVersion: "document-market-signal-v1",
  signalThreshold: 0.15,
  confidenceThreshold: 0.6,
  calibrationStartedAt: "2026-01-01T00:00:00Z",
  calibrationEndedAt: "2026-04-01T00:00:00Z",
  evaluationStartedAt: "2026-04-01T00:00:00Z",
  evaluationEndedAt: "2026-11-01T00:00:00Z",
  createdAt: "2026-11-01T12:00:00Z",
  completedAt: "2026-11-01T12:00:01Z",
  status: "completed",
  results: [{ horizonDays: 1, sampleSize: 8, meanReturn: 0.01, medianReturn: 0.008, positiveRate: 0.625, baselinePositiveRate: 0.51, confidenceIntervalLow: 0.3, confidenceIntervalHigh: 0.86 }],
};

describe("backtestService", () => {
  beforeEach(() => invoke.mockReset());

  it("valida e envia parâmetros explícitos", async () => {
    invoke.mockResolvedValueOnce(report);
    const request = { assetId: "asset:b3:PETR4", signalThreshold: 0.15, confidenceThreshold: 0.6 };
    expect((await runBacktest(request)).results[0]!.sampleSize).toBe(8);
    expect(invoke).toHaveBeenCalledWith("run_backtest", { request });
  });

  it("aceita ausência de execução anterior", async () => {
    invoke.mockResolvedValueOnce(null);
    expect(await getLatestBacktest("asset:b3:PETR4")).toBeNull();
  });
});
