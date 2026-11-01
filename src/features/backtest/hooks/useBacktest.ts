import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getLatestBacktest, runBacktest } from "@/services/backtestService";
import type { RunBacktestRequest } from "@/types/backtest";

export function useLatestBacktest(assetId?: string) {
  return useQuery({
    queryKey: ["backtest", assetId],
    queryFn: () => getLatestBacktest(assetId!),
    enabled: Boolean(assetId),
  });
}

export function useRunBacktest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: RunBacktestRequest) => runBacktest(request),
    onSuccess: (report) => {
      queryClient.setQueryData(["backtest", report.asset.id], report);
    },
  });
}
