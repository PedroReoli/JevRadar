import type { Asset, AssetClass } from "@/types/assets";

export interface CoverageGapItem {
  asset: Asset;
  closeValue: number;
  previousCloseValue: number;
  changePercent: number;
  observedAt: string;
  marketSourceName: string;
  evidenceCount: number;
  independentSourceCount: number;
  lastEvidenceAt: string | null;
}

export interface CoverageGapPage {
  items: CoverageGapItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  periodHours: number;
  minimumMovementPercent: number;
  maximumEvidenceCount: number;
  methodologyVersion: string;
}

export interface CoverageGapFilter {
  periodHours: 24 | 168 | 720;
  assetClass: AssetClass | "";
  minimumMovementPercent: 1 | 2 | 5;
  maximumEvidenceCount: 0 | 1 | 3;
  page: number;
}
