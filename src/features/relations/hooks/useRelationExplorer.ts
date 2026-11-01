import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

import { listMarketRelations } from "@/services/marketService";
import type { AssetClass } from "@/types/assets";
import type { MarketEventSnapshot, MarketRelationFilter } from "@/types/market";

const periods = new Set<MarketRelationFilter["periodHours"]>([24, 168, 720]);
const assetClasses = new Set<AssetClass>(["b3Equity", "b3Fund", "usEquity", "usFund", "crypto", "macro"]);
const relationTypes = new Set<MarketEventSnapshot["relationType"]>(["known", "correlation", "hypothesis", "unproven_causality"]);
const confidenceLevels = new Set<MarketRelationFilter["minimumConfidence"]>([0, 0.5, 0.7, 0.85]);

function positivePage(value: string | null) {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export function useRelationExplorer() {
  const [params, setParams] = useSearchParams();
  const periodCandidate = Number(params.get("period")) as MarketRelationFilter["periodHours"];
  const classCandidate = params.get("class") as AssetClass | null;
  const relationCandidate = params.get("relation") as MarketEventSnapshot["relationType"] | null;
  const confidenceCandidate = Number(params.get("confidence")) as MarketRelationFilter["minimumConfidence"];
  const filter: MarketRelationFilter = {
    periodHours: periods.has(periodCandidate) ? periodCandidate : 168,
    countryCode: (params.get("country") ?? "").slice(0, 16).toUpperCase(),
    assetClass: classCandidate && assetClasses.has(classCandidate) ? classCandidate : null,
    relationType: relationCandidate && relationTypes.has(relationCandidate) ? relationCandidate : "",
    minimumConfidence: confidenceLevels.has(confidenceCandidate) ? confidenceCandidate : 0.5,
    page: positivePage(params.get("page")),
  };
  const relationQuery = useQuery({
    queryKey: ["market-relations", filter],
    queryFn: () => listMarketRelations(filter),
  });
  const updateFilter = useCallback((key: "period" | "country" | "class" | "relation" | "confidence" | "page", value: string) => {
    const next = new URLSearchParams(params);
    const isDefault = !value
      || (key === "period" && value === "168")
      || (key === "confidence" && value === "0.5")
      || (key === "page" && value === "1");
    if (isDefault) next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  }, [params, setParams]);

  return { relationQuery, filter, updateFilter };
}
