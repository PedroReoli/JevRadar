import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

import { listAlertHistoryPage } from "@/services/insightsService";
import type { AlertHistoryFilter, AlertLevel } from "@/types/insights";

function positivePage(value: string | null) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

function alertLevel(value: string | null): AlertLevel | null {
  const parsed = Number(value);
  return parsed === 1 || parsed === 2 || parsed === 3 || parsed === 4 ? parsed : null;
}

export function useAlertHistoryPage() {
  const [params, setParams] = useSearchParams();
  const assetCandidate = params.get("asset");
  const filter: AlertHistoryFilter = {
    alertLevel: alertLevel(params.get("level")),
    assetId: assetCandidate && assetCandidate.length <= 240 ? assetCandidate : null,
    page: positivePage(params.get("page")),
  };
  const historyQuery = useQuery({
    queryKey: ["alert-history-page", filter],
    queryFn: () => listAlertHistoryPage(filter),
  });
  const updateFilter = useCallback((key: "level" | "asset" | "page", value: string) => {
    const next = new URLSearchParams(params);
    if (!value || (key === "page" && value === "1")) next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  }, [params, setParams]);
  return { historyQuery, filter, updateFilter };
}
