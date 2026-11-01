import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getMarketOverview, getMarketSeries, refreshMarketData } from "@/services/marketService";
import type { MarketOverviewFilter } from "@/types/market";

const marketOverviewKey = ["market-overview"] as const;

export function useMarketOverview(filter: MarketOverviewFilter) {
  return useQuery({
    queryKey: [...marketOverviewKey, filter],
    queryFn: () => getMarketOverview(filter),
    refetchInterval: 60_000,
  });
}

export function useMarketSeries(assetId: string | null, periodHours: number) {
  return useQuery({
    enabled: Boolean(assetId),
    queryKey: ["market-series", assetId, periodHours],
    queryFn: () => getMarketSeries(assetId!, periodHours),
    refetchInterval: 60_000,
  });
}

export function useRefreshMarketData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: refreshMarketData,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: marketOverviewKey }),
        queryClient.invalidateQueries({ queryKey: ["system-status"] }),
      ]);
    },
  });
}
