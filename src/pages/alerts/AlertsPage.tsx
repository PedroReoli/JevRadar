import { Bell } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { PageState } from "@/components/product/PageState";
import { AlertFilters } from "@/features/alerts/components/AlertFilters";
import { AlertHistoryList } from "@/features/alerts/components/AlertHistoryList";
import { AlertPagination } from "@/features/alerts/components/AlertPagination";
import { useAlertHistoryPage } from "@/features/alerts/hooks/useAlertHistoryPage";
import styles from "@/styles/ProductPage.module.css";

export function AlertsPage() {
  const { t } = useTranslation();
  const { filter, historyQuery, updateFilter } = useAlertHistoryPage();

  useEffect(() => {
    const totalPages = historyQuery.data?.totalPages;
    if (totalPages && filter.page > totalPages) updateFilter("page", String(totalPages));
  }, [filter.page, historyQuery.data?.totalPages, updateFilter]);

  return <main className={styles.page}>
    <header className={styles.header}><div><span className={styles.eyebrow}>{t("product.alerts.eyebrow")}</span><h1>{t("product.alerts.title")}</h1><p>{t("product.alerts.description")}</p></div><Bell aria-hidden="true" size="var(--icon-size-xl)" /></header>
    <AlertFilters alertLevel={filter.alertLevel} assetId={filter.assetId} assets={historyQuery.data?.assets ?? []} onChange={(key, value) => updateFilter(key, value)} />
    {historyQuery.isPending ? <PageState kind="loading" message={t("product.loading")} /> : null}
    {historyQuery.isError ? <PageState actionLabel={t("product.retry")} kind="error" message={t("product.loadError")} onAction={() => void historyQuery.refetch()} /> : null}
    {!historyQuery.isPending && !historyQuery.isError && historyQuery.data?.items.length === 0 ? <PageState kind="empty" message={t("product.alerts.empty")} /> : null}
    {historyQuery.data ? <><AlertHistoryList alerts={historyQuery.data.items} /><AlertPagination onChange={(page) => updateFilter("page", String(page))} page={historyQuery.data.page} totalItems={historyQuery.data.totalItems} totalPages={historyQuery.data.totalPages} /></> : null}
    <footer className={styles.disclosure}>{t("product.disclosure")}</footer>
  </main>;
}
