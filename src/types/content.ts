import type { Asset } from "@/types/assets";

export type ContentSourceKind = "rss" | "reddit" | "forum" | "x";
export type ContentSourceRunStatus = "completed" | "failed" | "skipped";

export interface ContentSourceStatus {
  id: string;
  name: string;
  sourceKind: ContentSourceKind;
  collectionMethod: string;
  enabled: boolean;
  userManaged: boolean;
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

export type DocumentAnalysisStatus = "pending" | "classified" | "no_asset";
export type DocumentContentType = "news" | "opinion" | "technical_analysis" | "meme" | "spam" | "uncertain";
export type DocumentSentiment = "optimistic" | "pessimistic" | "neutral" | "uncertain";

export interface DocumentFeedItem {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceKind: ContentSourceKind;
  title: string | null;
  excerpt: string;
  canonicalUrl: string | null;
  language: string | null;
  publishedAt: string;
  analysisStatus: DocumentAnalysisStatus;
  asset: Asset | null;
  sentiment: DocumentSentiment | null;
  sentimentProbability: number | null;
  relevanceExpected: number | null;
  contentType: DocumentContentType | null;
  hypeProbability: number | null;
  factualClaimProbability: number | null;
  confidence: number | null;
  modelVersion: string | null;
  questionVersion: string | null;
}

export interface DocumentFeedPage {
  items: DocumentFeedItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface DocumentFeedFilter {
  query: string;
  sourceKind: ContentSourceKind | "";
  contentType: DocumentContentType | "";
  sentiment: DocumentSentiment | "";
  analysisStatus: DocumentAnalysisStatus | "";
  minimumConfidence: 0 | 0.5 | 0.7 | 0.85;
  page: number;
}
