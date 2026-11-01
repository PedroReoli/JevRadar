import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

import { getMarketContextOverview } from "@/services/marketService";
import type { MarketContextFilter } from "@/types/market";

const periods = new Set<MarketContextFilter["periodHours"]>([24, 168, 720]);
const confidenceLevels = new Set<MarketContextFilter["minimumConfidence"]>([0, 0.5, 0.7, 0.85]);

export function useMarketContext() {
  const [params, setParams] = useSearchParams();
  const periodCandidate = Number(params.get("period")) as MarketContextFilter["periodHours"];
  const confidenceCandidate = Number(params.get("confidence")) as MarketContextFilter["minimumConfidence"];
  const filter: MarketContextFilter = {
    periodHours: periods.has(periodCandidate) ? periodCandidate : 168,
    minimumConfidence: confidenceLevels.has(confidenceCandidate) ? confidenceCandidate : 0.5,
  };
  const contextQuery = useQuery({
    queryKey: ["market-context", filter],
    queryFn: () => getMarketContextOverview(filter),
  });
  const updateFilter = useCallback((key: "period" | "confidence", value: string) => {
    const next = new URLSearchParams(params);
    const isDefault = (key === "period" && value === "168")
      || (key === "confidence" && value === "0.5");
    if (isDefault) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  }, [params, setParams]);

  return { contextQuery, filter, updateFilter };
}
