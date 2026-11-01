import { FileBarChart } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PageState } from "@/components/product/PageState";
import { DatabaseExportPanel } from "@/features/reports/components/DatabaseExportPanel";
import { MarketReportExportPanel } from "@/features/reports/components/MarketReportExportPanel";
import { RecentBacktestsPanel } from "@/features/reports/components/RecentBacktestsPanel";
import { ReportsMetrics } from "@/features/reports/components/ReportsMetrics";
import { useBacktestHistory, useAlertHistory, useCollectionHistory } from "@/features/insights/hooks/useInsights";
import styles from "@/styles/ProductPage.module.css";

export function ReportsPage() {
  const { t } = useTranslation();
  const backtests = useBacktestHistory();
  const alerts = useAlertHistory();
  const collections = useCollectionHistory();
  const isPending = backtests.isPending || alerts.isPending || collections.isPending;
  const isError = backtests.isError || alerts.isError || collections.isError;

  return (
    <main className={styles.page}>
      <header className={styles.header}><div><span className={styles.eyebrow}>{t("product.reports.eyebrow")}</span><h1>{t("product.reports.title")}</h1><p>{t("product.reports.description")}</p></div><FileBarChart aria-hidden="true" size="var(--icon-size-xl)" /></header>
      {isPending ? <PageState kind="loading" message={t("product.loading")} /> : null}
      {isError ? <PageState actionLabel={t("product.retry")} kind="error" message={t("product.loadError")} onAction={() => void backtests.refetch()} /> : null}
      {!isPending && !isError ? <ReportsMetrics alertCount={alerts.data?.length ?? 0} backtestCount={backtests.data?.length ?? 0} collectionCount={collections.data?.length ?? 0} /> : null}
      <MarketReportExportPanel />
      <DatabaseExportPanel />
      <RecentBacktestsPanel reports={backtests.data ?? []} />
      <footer className={styles.disclosure}>{t("product.disclosure")}</footer>
    </main>
  );
}
