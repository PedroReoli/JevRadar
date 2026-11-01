import { ArrowRight, CircleGauge, RadioTower, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { CollectionStatusCard } from "@/features/dashboard/components/CollectionStatusCard";
import { MarketSnapshotPanel } from "@/features/dashboard/components/MarketSnapshotPanel";
import { SystemHealthCard } from "@/features/dashboard/components/SystemHealthCard";
import { useMarketOverview, useRefreshMarketData } from "@/features/dashboard/hooks/useMarketOverview";
import { useSystemStatus } from "@/hooks/useSystemStatus";
import styles from "@/pages/dashboard/DashboardPage.module.css";
import type { ComponentStatus } from "@/types/system";

export function DashboardPage() {
  const { t } = useTranslation();
  const statusQuery = useSystemStatus();
  const marketQuery = useMarketOverview();
  const refreshMutation = useRefreshMarketData();
  const fallbackStatus: ComponentStatus = statusQuery.isPending ? "pending" : "unavailable";
  const status = statusQuery.data;

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

      {refreshMutation.isError ? <div className={styles.errorMessage} role="alert">{t("dashboard.refreshError")}</div> : null}

      <section className={styles.grid} aria-label={t("dashboard.systemHealth")}>
        <SystemHealthCard fallbackStatus={fallbackStatus} status={status} />
        <CollectionStatusCard collection={marketQuery.data?.latestCollection ?? null} />
      </section>

      {marketQuery.isError ? (
        <div className={styles.errorMessage} role="alert">{t("dashboard.marketLoadError")}</div>
      ) : (
        <MarketSnapshotPanel snapshots={marketQuery.data?.snapshots ?? []} />
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
