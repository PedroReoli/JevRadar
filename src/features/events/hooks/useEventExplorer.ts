import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

import { listMarketEvents } from "@/services/marketService";
import type { MarketEventFilter, MarketEventSnapshot } from "@/types/market";

const eventTypes = new Set<MarketEventSnapshot["eventType"]>(["political", "economic", "regulatory", "climate", "health", "technology", "geopolitical", "other"]);
const relationTypes = new Set<MarketEventSnapshot["relationType"]>(["known", "correlation", "hypothesis", "unproven_causality"]);
const confidenceLevels = new Set<MarketEventFilter["minimumConfidence"]>([0, 0.5, 0.7, 0.85]);

function allowedValue<T extends string>(value: string | null, allowed: Set<T>): T | "" {
  return value && allowed.has(value as T) ? value as T : "";
}

function positivePage(value: string | null) {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export function useEventExplorer() {
  const [params, setParams] = useSearchParams();
  const confidenceCandidate = Number(params.get("confidence")) as MarketEventFilter["minimumConfidence"];
  const filter: MarketEventFilter = {
    eventType: allowedValue(params.get("type"), eventTypes),
    countryCode: (params.get("country") ?? "").slice(0, 16).toUpperCase(),
    assetId: (params.get("asset") ?? "").slice(0, 120),
    relationType: allowedValue(params.get("relation"), relationTypes),
    minimumConfidence: confidenceLevels.has(confidenceCandidate) ? confidenceCandidate : 0,
    page: positivePage(params.get("page")),
  };
  const eventQuery = useQuery({
    queryKey: ["market-events", filter],
    queryFn: () => listMarketEvents(filter),
  });
  const updateFilter = useCallback((key: "type" | "country" | "asset" | "relation" | "confidence" | "page", value: string) => {
    const next = new URLSearchParams(params);
    const isDefault = !value || value === "0" || (key === "page" && value === "1");
    if (isDefault) next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  }, [params, setParams]);

  return { eventQuery, filter, updateFilter };
}
