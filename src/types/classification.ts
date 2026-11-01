export interface ClassificationSummary {
  status: "completed" | "partial" | "failed" | "skipped";
  analyzedDocumentCount: number;
  classifiedDocumentCount: number;
  noAssetDocumentCount: number;
  failedDocumentCount: number;
  errorCode: string | null;
}
