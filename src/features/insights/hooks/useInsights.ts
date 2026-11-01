import { useQuery } from "@tanstack/react-query";

import {
  getJevUsage,
  getSignalReport,
  listAlertHistory,
  listBacktestHistory,
  listCollectionHistory,
} from "@/services/insightsService";

export function useSignalReport(signalId?: string) {
  return useQuery({
    queryKey: ["signal-report", signalId],
    queryFn: () => getSignalReport(signalId!),
    enabled: Boolean(signalId),
  });
}

export function useAlertHistory() {
  return useQuery({ queryKey: ["alert-history"], queryFn: () => listAlertHistory() });
}

export function useCollectionHistory() {
  return useQuery({ queryKey: ["collection-history"], queryFn: () => listCollectionHistory() });
}

export function useBacktestHistory(assetId?: string) {
  return useQuery({
    queryKey: ["backtest-history", assetId ?? "all"],
    queryFn: () => listBacktestHistory(assetId),
  });
}

export function useJevUsage() {
  return useQuery({ queryKey: ["jev-usage"], queryFn: getJevUsage });
}
