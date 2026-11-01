import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@tauri-apps/api/core", () => ({
  invoke,
  isTauri: () => true,
}));

import {
  addWatchlistAsset,
  getDefaultWatchlist,
  listAssets,
  refreshAssetCatalog,
  removeWatchlistAsset,
} from "@/services/catalogService";

const asset = {
  id: "asset:b3:PETR4",
  symbol: "PETR4",
  name: "Petrobras PN",
  assetClass: "b3Equity",
  exchange: "B3",
  currency: "BRL",
  countryCode: "BR",
};

const watchlist = {
  id: "watchlist:default",
  name: "Principal",
  limit: 50,
  assets: [{ asset, enabled: true, addedAt: "2026-11-01 00:00:00" }],
};

describe("catalogService", () => {
  beforeEach(() => invoke.mockReset());

  it("envia filtros tipados e valida o catálogo retornado", async () => {
    invoke.mockResolvedValueOnce([asset]);
    await expect(listAssets("petrobras", "b3Equity")).resolves.toEqual([asset]);
    expect(invoke).toHaveBeenCalledWith("list_assets", {
      query: "petrobras",
      assetClass: "b3Equity",
    });

    invoke.mockResolvedValueOnce([{ ...asset, assetClass: "unknown" }]);
    await expect(listAssets()).rejects.toThrow();
  });

  it("mantém os contratos das mutações da watchlist", async () => {
    invoke.mockResolvedValue(watchlist);

    await expect(getDefaultWatchlist()).resolves.toEqual(watchlist);
    await expect(addWatchlistAsset(asset.id)).resolves.toEqual(watchlist);
    await expect(removeWatchlistAsset(asset.id)).resolves.toEqual(watchlist);

    expect(invoke).toHaveBeenNthCalledWith(1, "get_default_watchlist");
    expect(invoke).toHaveBeenNthCalledWith(2, "add_watchlist_asset", { assetId: asset.id });
    expect(invoke).toHaveBeenNthCalledWith(3, "remove_watchlist_asset", { assetId: asset.id });
  });

  it("valida o resultado parcial da sincronização de catálogos", async () => {
    invoke.mockResolvedValueOnce({
      status: "partial",
      upsertedCount: 480,
      refreshedAt: "2026-11-01T12:00:00Z",
      sources: [
        { sourceId: "source:brapi", status: "completed", discoveredCount: 480, errorCode: null },
        { sourceId: "source:binance", status: "failed", discoveredCount: 0, errorCode: "catalog_request_failed" },
      ],
    });

    await expect(refreshAssetCatalog()).resolves.toMatchObject({ status: "partial", upsertedCount: 480 });
    expect(invoke).toHaveBeenCalledWith("refresh_asset_catalog");
  });
});
