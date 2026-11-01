import { invoke, isTauri } from "@tauri-apps/api/core";
import { z } from "zod";

import type { Asset, AssetClass, Watchlist } from "@/types/assets";

const assetClassSchema = z.enum(["b3Equity", "b3Fund", "crypto", "macro"]);
const assetSchema = z.object({
  id: z.string().min(1),
  symbol: z.string().min(1),
  name: z.string().min(1),
  assetClass: assetClassSchema,
  exchange: z.string().min(1),
  currency: z.string().min(1),
  countryCode: z.string().nullable(),
});
const watchlistSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  limit: z.number().int().min(1).max(50),
  assets: z.array(
    z.object({
      asset: assetSchema,
      enabled: z.boolean(),
      addedAt: z.string().min(1),
    }),
  ),
});

function requireDesktopRuntime() {
  if (!isTauri()) {
    throw new Error("desktop_runtime_required");
  }
}

export async function listAssets(query?: string, assetClass?: AssetClass): Promise<Asset[]> {
  requireDesktopRuntime();
  const response: unknown = await invoke("list_assets", {
    query: query || null,
    assetClass: assetClass || null,
  });
  return z.array(assetSchema).parse(response);
}

export async function getDefaultWatchlist(): Promise<Watchlist> {
  requireDesktopRuntime();
  const response: unknown = await invoke("get_default_watchlist");
  return watchlistSchema.parse(response);
}

export async function addWatchlistAsset(assetId: string): Promise<Watchlist> {
  requireDesktopRuntime();
  const response: unknown = await invoke("add_watchlist_asset", { assetId });
  return watchlistSchema.parse(response);
}

export async function removeWatchlistAsset(assetId: string): Promise<Watchlist> {
  requireDesktopRuntime();
  const response: unknown = await invoke("remove_watchlist_asset", { assetId });
  return watchlistSchema.parse(response);
}
