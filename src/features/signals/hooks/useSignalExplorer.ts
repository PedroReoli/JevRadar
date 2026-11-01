import { useSearchParams } from "react-router-dom";

import { useMarketOverview } from "@/features/dashboard/hooks/useMarketOverview";
import type {
  SignalConfidence,
  SignalDirection,
  SignalExplorerFilters,
  SignalExplorerState,
  SignalPeriodHours,
} from "@/features/signals/types";
import type { MarketSignalSnapshot } from "@/types/market";

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

function buildExplorerState(
  signals: MarketSignalSnapshot[],
  filters: SignalExplorerFilters,
): SignalExplorerState {
  const assets = Array.from(new Map(signals.map((signal) => [signal.asset.id, signal.asset])).values())
    .sort((left, right) => left.symbol.localeCompare(right.symbol));
  const filteredSignals = signals
    .filter((signal) => !filters.assetId || signal.asset.id === filters.assetId)
    .filter((signal) => filters.direction === "all" || getSignalDirection(signal.signalScore) === filters.direction)
    .filter((signal) => signal.confidence >= filters.minimumConfidence)
    .sort((left, right) => right.windowEndedAt.localeCompare(left.windowEndedAt));
  const summary = filteredSignals.reduce<SignalExplorerState["summary"]>(
    (result, signal) => {
      result.total += 1;
      result[getSignalDirection(signal.signalScore)] += 1;
      return result;
    },
    { total: 0, positive: 0, neutral: 0, negative: 0 },
  );

  return { assets, filteredSignals, filters, summary };
}

export function useSignalExplorer() {
  const [params, setParams] = useSearchParams();
  const filters = parseFilters(params);
  const overviewQuery = useMarketOverview({
    periodHours: filters.periodHours,
    assetClass: null,
    minimumConfidence: filters.minimumConfidence,
  });
  const state = buildExplorerState(overviewQuery.data?.signals ?? [], filters);

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

  return { overviewQuery, state, updateFilter };
}
