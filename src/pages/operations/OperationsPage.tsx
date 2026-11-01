import { Activity } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { PageState } from "@/components/product/PageState";
import { useJevUsage } from "@/features/insights/hooks/useInsights";
import { JevUsageMetrics } from "@/features/operations/components/JevUsageMetrics";
import { OperationsFilters } from "@/features/operations/components/OperationsFilters";
import { OperationsPagination } from "@/features/operations/components/OperationsPagination";
import { OperationsRunList } from "@/features/operations/components/OperationsRunList";
import { useOperationsHistory } from "@/features/operations/hooks/useOperationsHistory";
import styles from "@/styles/ProductPage.module.css";

export function OperationsPage() {
  const { t } = useTranslation();
  const { historyQuery, filter, updateFilter } = useOperationsHistory();
  const usageQuery = useJevUsage();
  const isError = historyQuery.isError || usageQuery.isError;

  useEffect(() => {
    const totalPages = historyQuery.data?.totalPages;
    if (totalPages && filter.page > totalPages) updateFilter("page", String(totalPages));
  }, [filter.page, historyQuery.data?.totalPages, updateFilter]);

  return <main className={styles.page}>
    <header className={styles.header}><div><span className={styles.eyebrow}>{t("product.operations.eyebrow")}</span><h1>{t("product.operations.title")}</h1><p>{t("product.operations.description")}</p></div><Activity aria-hidden="true" size="var(--icon-size-xl)" /></header>
    {usageQuery.data ? <JevUsageMetrics usage={usageQuery.data} /> : null}
    <OperationsFilters onChange={(key, value) => updateFilter(key, value)} sourceId={filter.sourceId} sourceIds={historyQuery.data?.sourceIds ?? []} status={filter.status} />
    {historyQuery.isPending || usageQuery.isPending ? <PageState kind="loading" message={t("product.loading")} /> : null}
    {isError ? <PageState actionLabel={t("product.retry")} kind="error" message={t("product.loadError")} onAction={() => { void historyQuery.refetch(); void usageQuery.refetch(); }} /> : null}
    {!historyQuery.isPending && !isError && historyQuery.data?.items.length === 0 ? <PageState kind="empty" message={t("product.operations.empty")} /> : null}
    {historyQuery.data ? <><OperationsRunList runs={historyQuery.data.items} /><OperationsPagination onChange={(page) => updateFilter("page", String(page))} page={historyQuery.data.page} totalItems={historyQuery.data.totalItems} totalPages={historyQuery.data.totalPages} /></> : null}
    <footer className={styles.disclosure}>{t("product.disclosure")}</footer>
  </main>;
}
