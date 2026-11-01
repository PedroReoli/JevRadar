import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

import { listCollectionHistoryPage } from "@/services/insightsService";
import type { CollectionHistoryFilter, CollectionRunStatus } from "@/types/insights";

const statuses = new Set<CollectionRunStatus>(["running", "completed", "partial", "failed"]);

function positivePage(value: string | null) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function useOperationsHistory() {
  const [params, setParams] = useSearchParams();
  const statusCandidate = params.get("status") as CollectionRunStatus | null;
  const sourceCandidate = params.get("source");
  const filter: CollectionHistoryFilter = {
    status: statusCandidate && statuses.has(statusCandidate) ? statusCandidate : null,
    sourceId: sourceCandidate && sourceCandidate.length <= 240 ? sourceCandidate : null,
    page: positivePage(params.get("page")),
  };
  const historyQuery = useQuery({
    queryKey: ["collection-history-page", filter],
    queryFn: () => listCollectionHistoryPage(filter),
  });
  const updateFilter = useCallback((key: "status" | "source" | "page", value: string) => {
    const next = new URLSearchParams(params);
    if (!value || (key === "page" && value === "1")) next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  }, [params, setParams]);
  return { historyQuery, filter, updateFilter };
}
