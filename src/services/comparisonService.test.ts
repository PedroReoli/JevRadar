import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@tauri-apps/api/core", () => ({ invoke, isTauri: () => true }));

import { getAssetComparison } from "@/services/comparisonService";

const asset = {
  id: "asset:b3:PETR4",
  symbol: "PETR4",
  name: "Petrobras PN",
  assetClass: "b3Equity",
  exchange: "B3",
  currency: "BRL",
  countryCode: "BR",
};

describe("comparisonService", () => {
  beforeEach(() => invoke.mockReset());

  it("valida o read model comparativo", async () => {
    invoke.mockResolvedValueOnce({ availableAssets: [asset], rows: [] });
    const request = { assetIds: [asset.id], periodHours: 168 as const, minimumConfidence: 0.5 as const };

    expect((await getAssetComparison(request)).availableAssets).toEqual([asset]);
    expect(invoke).toHaveBeenCalledWith("get_asset_comparison", {
      assetIds: [asset.id],
      periodHours: 168,
      minimumConfidence: 0.5,
    });
  });

  it("rejeita mais de quatro ativos antes de invocar o core", async () => {
    await expect(getAssetComparison({
      assetIds: ["asset:a", "asset:b", "asset:c", "asset:d", "asset:e"],
      periodHours: 168,
      minimumConfidence: 0.5,
    })).rejects.toThrow();
    expect(invoke).not.toHaveBeenCalled();
  });
});
