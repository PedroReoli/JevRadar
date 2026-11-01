export type ContentSourceKind = "rss" | "reddit" | "forum" | "x";
export type ContentSourceRunStatus = "completed" | "failed" | "skipped";

export interface ContentSourceStatus {
  id: string;
  name: string;
  sourceKind: ContentSourceKind;
  collectionMethod: string;
  enabled: boolean;
  documentCount: number;
  status: ContentSourceRunStatus | null;
  lastCollectedAt: string | null;
  errorCode: string | null;
}

export interface ContentOverview {
  sources: ContentSourceStatus[];
  totalDocumentCount: number;
  unclassifiedDocumentCount: number;
}

export interface ContentCollectionSummary {
  storedDocumentCount: number;
  sourceErrorCount: number;
  sources: Array<{
    sourceId: string;
    status: ContentSourceRunStatus;
    storedDocumentCount: number;
    errorCode: string | null;
  }>;
}
