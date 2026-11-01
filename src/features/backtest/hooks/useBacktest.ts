import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getLatestBacktest, listBacktestHistoryPage, runBacktest } from "@/services/backtestService";
import type { RunBacktestRequest } from "@/types/backtest";

export function useLatestBacktest(assetId?: string) {
  return useQuery({
    queryKey: ["backtest", assetId],
    queryFn: () => getLatestBacktest(assetId!),
    enabled: Boolean(assetId),
  });
}

export function useBacktestHistoryPage(assetId: string | undefined, page: number) {
  return useQuery({
    queryKey: ["backtest-history-page", assetId ?? "all", page],
    queryFn: () => listBacktestHistoryPage(assetId, page),
  });
}

export function useRunBacktest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: RunBacktestRequest) => runBacktest(request),
    onSuccess: (report) => {
      queryClient.setQueryData(["backtest", report.asset.id], report);
      void queryClient.invalidateQueries({ queryKey: ["backtest-history-page", report.asset.id] });
    },
  });
}
