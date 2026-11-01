import { ArrowRight, CircleGauge, RadioTower, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useSearchParams } from "react-router-dom";

import { CollectionStatusCard } from "@/features/dashboard/components/CollectionStatusCard";
import { EventTimeline } from "@/features/dashboard/components/EventTimeline";
import { MarketSnapshotPanel } from "@/features/dashboard/components/MarketSnapshotPanel";
import { PriceSentimentChart } from "@/features/dashboard/components/PriceSentimentChart";
import { RadarFilters } from "@/features/dashboard/components/RadarFilters";
import { SignalRadarPanel } from "@/features/dashboard/components/SignalRadarPanel";
import { SystemHealthCard } from "@/features/dashboard/components/SystemHealthCard";
import { useMarketOverview, useMarketSeries, useRefreshMarketData } from "@/features/dashboard/hooks/useMarketOverview";
import { useSystemStatus } from "@/hooks/useSystemStatus";
import styles from "@/pages/dashboard/DashboardPage.module.css";
import type { ComponentStatus } from "@/types/system";
import type { AssetClass } from "@/types/assets";

const supportedClasses = new Set<AssetClass>(["b3Equity", "b3Fund", "crypto", "macro"]);
const supportedPeriods = new Set([1, 6, 24, 168, 720]);
const supportedConfidence = new Set([0, 0.5, 0.7, 0.85]);

export function DashboardPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const periodParam = Number(searchParams.get("period") ?? 24);
  const classParam = searchParams.get("class") as AssetClass | null;
  const confidenceParam = Number(searchParams.get("confidence") ?? 0);
  const filter = {
    periodHours: supportedPeriods.has(periodParam) ? periodParam : 24,
    assetClass: classParam && supportedClasses.has(classParam) ? classParam : null,
    minimumConfidence: supportedConfidence.has(confidenceParam) ? confidenceParam : 0,
  };
  const statusQuery = useSystemStatus();
  const marketQuery = useMarketOverview(filter);
  const requestedAssetId = searchParams.get("asset");
  const visibleAssets = marketQuery.data?.snapshots.map((snapshot) => snapshot.asset) ?? [];
  const selectedAssetId = visibleAssets.some((asset) => asset.id === requestedAssetId)
    ? requestedAssetId
    : visibleAssets[0]?.id ?? null;
  const seriesQuery = useMarketSeries(selectedAssetId, filter.periodHours);
  const refreshMutation = useRefreshMarketData();
  const fallbackStatus: ComponentStatus = statusQuery.isPending ? "pending" : "unavailable";
  const status = statusQuery.data;
  const updateFilter = (key: "periodHours" | "assetClass" | "minimumConfidence", value: number | AssetClass | null) => {
    const next = new URLSearchParams(searchParams);
    const param = key === "periodHours" ? "period" : key === "assetClass" ? "class" : "confidence";
    if (value === null || value === 0) next.delete(param);
    else next.set(param, String(value));
    setSearchParams(next, { replace: true });
  };
  const updateAsset = (assetId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("asset", assetId);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>{t("dashboard.eyebrow")}</span>
          <h1>{t("dashboard.title")}</h1>
          <p>{t("dashboard.description")}</p>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.runtime}>
            <CircleGauge aria-hidden="true" size="var(--icon-size-sm)" />
            {status?.version ?? "—"}
          </span>
          <button
            className={styles.refreshAction}
            disabled={refreshMutation.isPending}
            onClick={() => refreshMutation.mutate()}
            type="button"
          >
            <RefreshCw aria-hidden="true" size="var(--icon-size-sm)" />
            {refreshMutation.isPending ? t("dashboard.refreshing") : t("dashboard.refresh")}
          </button>
        </div>
      </header>

      <RadarFilters filter={filter} onChange={updateFilter} />

      {refreshMutation.isError ? <div className={styles.errorMessage} role="alert">{t("dashboard.refreshError")}</div> : null}

      <section className={styles.grid} aria-label={t("dashboard.systemHealth")}>
        <SystemHealthCard fallbackStatus={fallbackStatus} status={status} />
        <CollectionStatusCard collection={marketQuery.data?.latestCollection ?? null} />
      </section>

      {marketQuery.isError ? (
        <div className={styles.errorMessage} role="alert">{t("dashboard.marketLoadError")}</div>
      ) : (
        <>
          <PriceSentimentChart
            assets={visibleAssets}
            onAssetChange={updateAsset}
            points={seriesQuery.data?.points ?? []}
            selectedAssetId={selectedAssetId}
          />
          <SignalRadarPanel signals={marketQuery.data?.signals ?? []} />
          <EventTimeline events={marketQuery.data?.events ?? []} />
          <MarketSnapshotPanel snapshots={marketQuery.data?.snapshots ?? []} />
        </>
      )}

      {marketQuery.data?.snapshots.every((snapshot) => snapshot.closeValue === null) ? (
        <article className={styles.emptyCard}>
          <span className={styles.emptySignal} aria-hidden="true">
            <RadioTower size="var(--icon-size-xl)" strokeWidth={1.4} />
          </span>
          <h2>{t("dashboard.noSignalsTitle")}</h2>
          <p>{t("dashboard.noSignalsDescription")}</p>
          <Link className={styles.primaryAction} to="/settings">
            {t("dashboard.openSettings")}
            <ArrowRight aria-hidden="true" size="var(--icon-size-sm)" />
          </Link>
        </article>
      ) : null}

      <footer className={styles.disclosure}>{t("dashboard.disclosure")}</footer>
    </div>
  );
}
