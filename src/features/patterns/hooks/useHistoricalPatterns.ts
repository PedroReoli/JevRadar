import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

import { listHistoricalPatterns } from "@/services/patternService";
import type { AssetClass } from "@/types/assets";
import type { HistoricalPatternFilter, HistoricalPatternOutcome } from "@/types/patterns";

const classes = new Set<AssetClass>(["b3Equity", "b3Fund", "crypto", "macro"]);
const horizons = new Set<HistoricalPatternFilter["horizonDays"]>([1, 7, 30]);
const outcomes = new Set<HistoricalPatternOutcome>(["all", "outperformed", "underperformed", "insufficient"]);
const samples = new Set<HistoricalPatternFilter["minimumSampleSize"]>([0, 5, 10, 30]);

function positivePage(value: string | null) {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export function useHistoricalPatterns() {
  const [params, setParams] = useSearchParams();
  const classCandidate = params.get("class") as AssetClass | null;
  const horizonCandidate = Number(params.get("horizon")) as HistoricalPatternFilter["horizonDays"];
  const outcomeCandidate = params.get("outcome") as HistoricalPatternOutcome | null;
  const sampleCandidate = Number(params.get("sample")) as HistoricalPatternFilter["minimumSampleSize"];
  const filter: HistoricalPatternFilter = {
    assetClass: classCandidate && classes.has(classCandidate) ? classCandidate : null,
    horizonDays: horizons.has(horizonCandidate) ? horizonCandidate : 7,
    outcome: outcomeCandidate && outcomes.has(outcomeCandidate) ? outcomeCandidate : "all",
    minimumSampleSize: samples.has(sampleCandidate) ? sampleCandidate : 0,
    page: positivePage(params.get("page")),
  };
  const patternQuery = useQuery({
    queryKey: ["historical-patterns", filter],
    queryFn: () => listHistoricalPatterns(filter),
  });
  const updateFilter = useCallback((key: "class" | "horizon" | "outcome" | "sample" | "page", value: string) => {
    const next = new URLSearchParams(params);
    const isDefault = !value
      || (key === "horizon" && value === "7")
      || (key === "outcome" && value === "all")
      || (key === "sample" && value === "0")
      || (key === "page" && value === "1");
    if (isDefault) next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  }, [params, setParams]);

  return { patternQuery, filter, updateFilter };
}
