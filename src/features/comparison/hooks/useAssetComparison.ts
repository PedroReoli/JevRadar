import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

import { getAssetComparison } from "@/services/comparisonService";
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
  const comparisonQuery = useQuery({
    queryKey: ["asset-comparison", { requestedAssetIds, periodHours, minimumConfidence }],
    queryFn: () => getAssetComparison({ assetIds: requestedAssetIds, periodHours, minimumConfidence }),
    refetchInterval: 60_000,
  });
  const availableAssets = comparisonQuery.data?.availableAssets ?? [];
  const availableIds = new Set(availableAssets.map((asset) => asset.id));
  const selectedIds = requestedAssetIds.filter((id) => availableIds.has(id));

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
    isError: comparisonQuery.isError,
    isPending: comparisonQuery.isPending,
    maximumAssets: MAXIMUM_ASSETS,
    minimumConfidence,
    periodHours,
    refetch: comparisonQuery.refetch,
    rows: comparisonQuery.data?.rows ?? [],
    selectedIds,
    toggleAsset,
    updateFilter,
  };
}
