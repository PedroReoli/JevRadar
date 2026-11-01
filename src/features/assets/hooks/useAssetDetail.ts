import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";

import { getLatestBacktest } from "@/services/backtestService";
import { getAssetDetail, getMarketSeries } from "@/services/marketService";

const PERIOD_HOURS = 720;

export function useAssetDetail(assetId?: string) {
  const detailQuery = useQuery({
    enabled: Boolean(assetId),
    queryKey: ["asset-detail", assetId, PERIOD_HOURS],
    queryFn: () => getAssetDetail(assetId!, PERIOD_HOURS),
    refetchInterval: 60_000,
  });
  const hasAsset = Boolean(detailQuery.data);
  const seriesQuery = useQuery({
    enabled: hasAsset,
    queryKey: ["market-series", assetId, PERIOD_HOURS],
    queryFn: () => getMarketSeries(assetId!, PERIOD_HOURS),
    refetchInterval: 60_000,
  });
  const backtestQuery = useQuery({
    enabled: hasAsset,
    queryKey: ["backtest", assetId],
    queryFn: () => getLatestBacktest(assetId!),
  });
  const refetch = useCallback(async () => {
    const detailResult = await detailQuery.refetch();
    if (detailResult.data) {
      await Promise.all([seriesQuery.refetch(), backtestQuery.refetch()]);
    }
  }, [backtestQuery, detailQuery, seriesQuery]);

  return {
    backtest: backtestQuery.data ?? null,
    detail: detailQuery.data ?? null,
    isError: detailQuery.isError || seriesQuery.isError || backtestQuery.isError,
    isPending: detailQuery.isPending || (hasAsset && (seriesQuery.isPending || backtestQuery.isPending)),
    points: seriesQuery.data?.points ?? [],
    refetch,
  };
}
