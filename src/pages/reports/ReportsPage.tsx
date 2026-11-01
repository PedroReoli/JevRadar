import { FileBarChart } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PageState } from "@/components/product/PageState";
import { DatabaseExportPanel } from "@/features/reports/components/DatabaseExportPanel";
import { MarketReportExportPanel } from "@/features/reports/components/MarketReportExportPanel";
import { RecentBacktestsPanel } from "@/features/reports/components/RecentBacktestsPanel";
import { ReportsMetrics } from "@/features/reports/components/ReportsMetrics";
import { VersionInventoryPanel } from "@/features/reports/components/VersionInventoryPanel";
import { useReportOverview } from "@/features/reports/hooks/useReportOverview";
import styles from "@/styles/ProductPage.module.css";

export function ReportsPage() {
  const { t } = useTranslation();
  const overview = useReportOverview();

  return <main className={styles.page}>
    <header className={styles.header}><div><span className={styles.eyebrow}>{t("product.reports.eyebrow")}</span><h1>{t("product.reports.title")}</h1><p>{t("product.reports.description")}</p></div><FileBarChart aria-hidden="true" size="var(--icon-size-xl)" /></header>
    {overview.isPending ? <PageState kind="loading" message={t("product.loading")} /> : null}
    {overview.isError ? <PageState actionLabel={t("product.retry")} kind="error" message={t("product.loadError")} onAction={() => void overview.refetch()} /> : null}
    {overview.data ? <>
      <ReportsMetrics alertCount={overview.data.alertCount} backtestCount={overview.data.backtestCount} collectionCount={overview.data.collectionCount} signalCount={overview.data.signalCount} />
      <VersionInventoryPanel versions={overview.data.versions} />
    </> : null}
    <MarketReportExportPanel />
    <DatabaseExportPanel />
    <RecentBacktestsPanel reports={overview.data?.recentBacktests ?? []} />
    <footer className={styles.disclosure}>{t("product.disclosure")}</footer>
  </main>;
}
