import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

import { listCoverageGaps } from "@/services/coverageService";
import type { AssetClass } from "@/types/assets";
import type { CoverageGapFilter } from "@/types/coverage";

const periods = new Set<CoverageGapFilter["periodHours"]>([24, 168, 720]);
const classes = new Set<AssetClass>(["b3Equity", "b3Fund", "crypto", "macro"]);
const movements = new Set<CoverageGapFilter["minimumMovementPercent"]>([1, 2, 5]);
const evidenceLimits = new Set<CoverageGapFilter["maximumEvidenceCount"]>([0, 1, 3]);

function positivePage(value: string | null) {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export function useCoverageGaps() {
  const [params, setParams] = useSearchParams();
  const period = Number(params.get("period")) as CoverageGapFilter["periodHours"];
  const assetClass = params.get("class") as AssetClass | null;
  const movement = Number(params.get("movement")) as CoverageGapFilter["minimumMovementPercent"];
  const evidence = Number(params.get("evidence")) as CoverageGapFilter["maximumEvidenceCount"];
  const filter: CoverageGapFilter = {
    periodHours: periods.has(period) ? period : 24,
    assetClass: assetClass && classes.has(assetClass) ? assetClass : "",
    minimumMovementPercent: movements.has(movement) ? movement : 2,
    maximumEvidenceCount: evidenceLimits.has(evidence) ? evidence : 0,
    page: positivePage(params.get("page")),
  };
  const gapsQuery = useQuery({ queryKey: ["coverage-gaps", filter], queryFn: () => listCoverageGaps(filter) });
  const updateFilter = useCallback((key: "period" | "class" | "movement" | "evidence" | "page", value: string) => {
    const next = new URLSearchParams(params);
    const defaults = { period: "24", class: "", movement: "2", evidence: "0", page: "1" };
    if (!value || value === defaults[key]) next.delete(key); else next.set(key, value);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  }, [params, setParams]);
  return { filter, gapsQuery, updateFilter };
}
