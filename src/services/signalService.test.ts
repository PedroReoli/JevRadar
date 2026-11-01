import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@tauri-apps/api/core", () => ({
  invoke,
  isTauri: () => true,
}));

import { getSignalExplorer } from "@/services/signalService";

const asset = {
  id: "asset:b3:PETR4",
  symbol: "PETR4",
  name: "Petrobras PN",
  assetClass: "b3Equity",
  exchange: "B3",
  currency: "BRL",
  countryCode: "BR",
};

describe("signalService", () => {
  beforeEach(() => invoke.mockReset());

  it("consulta e valida o explorador dedicado de sinais", async () => {
    invoke.mockResolvedValueOnce({
      signals: [],
      assets: [asset],
      summary: { total: 0, positive: 0, neutral: 0, negative: 0 },
    });

    const result = await getSignalExplorer({
      periodHours: 168,
      minimumConfidence: 0.7,
      direction: "positive",
      assetId: asset.id,
    });

    expect(result.assets).toEqual([asset]);
    expect(invoke).toHaveBeenCalledWith("get_signal_explorer", {
      periodHours: 168,
      minimumConfidence: 0.7,
      direction: "positive",
      assetId: asset.id,
    });
  });

  it("rejeita filtros inválidos antes de invocar o core", async () => {
    await expect(getSignalExplorer({
      periodHours: 0,
      minimumConfidence: 0,
      direction: null,
      assetId: null,
    })).rejects.toThrow();
    expect(invoke).not.toHaveBeenCalled();
  });
});
