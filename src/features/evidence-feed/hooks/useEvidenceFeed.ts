import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

import { listDocumentFeed } from "@/services/contentService";
import type {
  ContentSourceKind,
  DocumentAnalysisStatus,
  DocumentContentType,
  DocumentFeedFilter,
  DocumentSentiment,
} from "@/types/content";

const sourceKinds = new Set<ContentSourceKind>(["rss", "reddit", "forum", "x"]);
const contentTypes = new Set<DocumentContentType>(["news", "opinion", "technical_analysis", "meme", "spam", "uncertain"]);
const sentiments = new Set<DocumentSentiment>(["optimistic", "pessimistic", "neutral", "uncertain"]);
const analysisStatuses = new Set<DocumentAnalysisStatus>(["pending", "classified", "no_asset"]);
const confidenceLevels = new Set<DocumentFeedFilter["minimumConfidence"]>([0, 0.5, 0.7, 0.85]);

function allowedValue<T extends string>(value: string | null, allowed: Set<T>): T | "" {
  return value && allowed.has(value as T) ? value as T : "";
}

function positivePage(value: string | null) {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export function useEvidenceFeed() {
  const [params, setParams] = useSearchParams();
  const confidenceCandidate = Number(params.get("confidence")) as DocumentFeedFilter["minimumConfidence"];
  const filter: DocumentFeedFilter = {
    query: (params.get("q") ?? "").slice(0, 100),
    sourceKind: allowedValue(params.get("source"), sourceKinds),
    contentType: allowedValue(params.get("type"), contentTypes),
    sentiment: allowedValue(params.get("sentiment"), sentiments),
    analysisStatus: allowedValue(params.get("status"), analysisStatuses),
    minimumConfidence: confidenceLevels.has(confidenceCandidate) ? confidenceCandidate : 0,
    page: positivePage(params.get("page")),
  };
  const feedQuery = useQuery({
    queryKey: ["document-feed", filter],
    queryFn: () => listDocumentFeed(filter),
  });

  const updateFilter = useCallback((key: "q" | "source" | "type" | "sentiment" | "status" | "confidence" | "page", value: string) => {
    const next = new URLSearchParams(params);
    const isDefault = !value || value === "0" || (key === "page" && value === "1");
    if (isDefault) next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  }, [params, setParams]);

  return { feedQuery, filter, updateFilter };
}
