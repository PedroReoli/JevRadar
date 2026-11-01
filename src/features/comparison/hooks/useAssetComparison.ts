import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { getDefaultWatchlist } from "@/services/catalogService";
import { getMarketOverview } from "@/services/marketService";
import type { AssetComparisonRow } from "@/types/comparison";
import type { MarketContextFilter } from "@/types/market";

const MAXIMUM_ASSETS = 4;
const periods = new Set<MarketContextFilter["periodHours"]>([24, 168, 720]);
const confidenceLevels = new Set<MarketContextFilter["minimumConfidence"]>([0, 0.5, 0.7, 0.85]);

function selectedAssetIds(value: string | null) {
  if (!value) return [];
  return [...new Set(value.split(",").map((item) => item.trim()).filter((item) => item.length > 0 && item.length <= 120))].slice(0, MAXIMUM_ASSETS);
}

export function useAssetComparison() {
  const [params, setParams] = useSearchParams();
  const periodCandidate = Number(params.get("period")) as MarketContextFilter["periodHours"];
  const confidenceCandidate = Number(params.get("confidence")) as MarketContextFilter["minimumConfidence"];
  const periodHours = periods.has(periodCandidate) ? periodCandidate : 168;
  const minimumConfidence = confidenceLevels.has(confidenceCandidate) ? confidenceCandidate : 0.5;
  const requestedAssetIds = selectedAssetIds(params.get("assets"));
  const watchlistQuery = useQuery({ queryKey: ["default-watchlist"], queryFn: getDefaultWatchlist });
  const overviewQuery = useQuery({
    queryKey: ["market-overview", { periodHours, assetClass: null, minimumConfidence }],
    queryFn: () => getMarketOverview({ periodHours, assetClass: null, minimumConfidence }),
    refetchInterval: 60_000,
  });
  const availableAssets = useMemo(
    () => watchlistQuery.data?.assets.filter((item) => item.enabled).map((item) => item.asset) ?? [],
    [watchlistQuery.data],
  );
  const availableIds = useMemo(() => new Set(availableAssets.map((asset) => asset.id)), [availableAssets]);
  const selectedIds = requestedAssetIds.filter((id) => availableIds.has(id));
  const rows = useMemo<AssetComparisonRow[]>(() => {
    if (!overviewQuery.data) return [];
    return selectedIds.flatMap((assetId) => {
      const asset = availableAssets.find((item) => item.id === assetId);
      if (!asset) return [];
      const snapshot = overviewQuery.data.snapshots.find((item) => item.asset.id === assetId);
      const signal = overviewQuery.data.signals.find((item) => item.asset.id === assetId);
      return [{
        asset,
        changePercent: snapshot?.changePercent ?? null,
        signalScore: signal?.signalScore ?? null,
        confidence: signal?.confidence ?? null,
        evidenceCount: signal?.evidenceCount ?? null,
        independentSourceCount: signal?.independentSourceCount ?? null,
        hypePenalty: signal?.hypePenalty ?? null,
        eventCount: overviewQuery.data.events.filter((item) => item.asset.id === assetId).length,
        observedAt: snapshot?.observedAt ?? null,
        marketSourceName: snapshot?.sourceName ?? null,
      }];
    });
  }, [availableAssets, overviewQuery.data, selectedIds]);

  const updateFilter = useCallback((key: "period" | "confidence", value: string) => {
    const next = new URLSearchParams(params);
    const isDefault = (key === "period" && value === "168") || (key === "confidence" && value === "0.5");
    if (isDefault) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  }, [params, setParams]);
  const toggleAsset = useCallback((assetId: string) => {
    const next = new URLSearchParams(params);
    const current = selectedAssetIds(params.get("assets"));
    const selected = current.includes(assetId)
      ? current.filter((id) => id !== assetId)
      : current.length < MAXIMUM_ASSETS ? [...current, assetId] : current;
    if (selected.length === 0) next.delete("assets");
    else next.set("assets", selected.join(","));
    setParams(next, { replace: true });
  }, [params, setParams]);

  return {
    availableAssets,
    isError: watchlistQuery.isError || overviewQuery.isError,
    isPending: watchlistQuery.isPending || overviewQuery.isPending,
    maximumAssets: MAXIMUM_ASSETS,
    minimumConfidence,
    periodHours,
    refetch: async () => Promise.all([watchlistQuery.refetch(), overviewQuery.refetch()]),
    rows,
    selectedIds,
    toggleAsset,
    updateFilter,
  };
}
