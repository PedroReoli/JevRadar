import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import type {
  SignalConfidence,
  SignalDirection,
  SignalExplorerFilters,
  SignalExplorerState,
  SignalPeriodHours,
} from "@/features/signals/types";
import { getSignalExplorer } from "@/services/signalService";

const periods = new Set<SignalPeriodHours>([24, 168, 720]);
const confidenceLevels = new Set<SignalConfidence>([0, 0.5, 0.7, 0.85]);
const directions = new Set<SignalDirection>(["all", "positive", "neutral", "negative"]);

export function getSignalDirection(score: number): Exclude<SignalDirection, "all"> {
  if (score >= 0.15) return "positive";
  if (score <= -0.15) return "negative";
  return "neutral";
}

function parseFilters(params: URLSearchParams): SignalExplorerFilters {
  const periodCandidate = Number(params.get("period")) as SignalPeriodHours;
  const confidenceCandidate = Number(params.get("confidence")) as SignalConfidence;
  const directionCandidate = params.get("direction") as SignalDirection | null;

  return {
    periodHours: periods.has(periodCandidate) ? periodCandidate : 24,
    minimumConfidence: confidenceLevels.has(confidenceCandidate) ? confidenceCandidate : 0,
    direction: directionCandidate && directions.has(directionCandidate) ? directionCandidate : "all",
    assetId: params.get("asset") ?? "",
  };
}

export function useSignalExplorer() {
  const [params, setParams] = useSearchParams();
  const filters = parseFilters(params);
  const signalsQuery = useQuery({
    queryKey: ["signal-explorer", filters],
    queryFn: () => getSignalExplorer({
      periodHours: filters.periodHours,
      minimumConfidence: filters.minimumConfidence,
      direction: filters.direction === "all" ? null : filters.direction,
      assetId: filters.assetId || null,
    }),
  });
  const state: SignalExplorerState = {
    assets: signalsQuery.data?.assets ?? [],
    filteredSignals: signalsQuery.data?.signals ?? [],
    filters,
    summary: signalsQuery.data?.summary ?? { total: 0, positive: 0, neutral: 0, negative: 0 },
  };

  const updateFilter = (key: "period" | "confidence" | "direction" | "asset", value: string) => {
    const next = new URLSearchParams(params);
    const isDefault =
      (key === "period" && value === "24")
      || (key === "confidence" && value === "0")
      || (key === "direction" && value === "all")
      || (key === "asset" && value === "");
    if (isDefault) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  return { signalsQuery, state, updateFilter };
}
