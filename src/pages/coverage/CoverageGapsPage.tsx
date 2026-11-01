import { ScanSearch } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { PageState } from "@/components/product/PageState";
import { CoverageGapFilters } from "@/features/coverage/components/CoverageGapFilters";
import { CoverageGapList } from "@/features/coverage/components/CoverageGapList";
import { CoverageGapPagination } from "@/features/coverage/components/CoverageGapPagination";
import { useCoverageGaps } from "@/features/coverage/hooks/useCoverageGaps";
import styles from "@/styles/ProductPage.module.css";

export function CoverageGapsPage() {
  const { t } = useTranslation();
  const { filter, gapsQuery, updateFilter } = useCoverageGaps();
  useEffect(() => {
    const totalPages = gapsQuery.data?.totalPages;
    if (totalPages && filter.page > totalPages) updateFilter("page", String(totalPages));
  }, [filter.page, gapsQuery.data?.totalPages, updateFilter]);
  return (
    <main className={styles.page}>
      <header className={styles.header}><div><span className={styles.eyebrow}>{t("coverage.eyebrow")}</span><h1>{t("coverage.title")}</h1><p>{t("coverage.description")}</p></div><ScanSearch aria-hidden="true" size="var(--icon-size-xl)" /></header>
      <CoverageGapFilters filter={filter} onChange={updateFilter} />
      {gapsQuery.isPending ? <PageState kind="loading" message={t("product.loading")} /> : null}
      {gapsQuery.isError ? <PageState actionLabel={t("product.retry")} kind="error" message={t("product.loadError")} onAction={() => void gapsQuery.refetch()} /> : null}
      {!gapsQuery.isPending && !gapsQuery.isError && gapsQuery.data?.items.length === 0 ? <PageState kind="empty" message={t("coverage.empty")} /> : null}
      {gapsQuery.data && gapsQuery.data.items.length > 0 ? <CoverageGapList items={gapsQuery.data.items} /> : null}
      {gapsQuery.data ? <CoverageGapPagination onChange={(page) => updateFilter("page", String(page))} page={gapsQuery.data.page} totalItems={gapsQuery.data.totalItems} totalPages={gapsQuery.data.totalPages} /> : null}
      {gapsQuery.data ? <p className={styles.meta}>{t("coverage.methodology", { version: gapsQuery.data.methodologyVersion })}</p> : null}
      <footer className={styles.disclosure}>{t("coverage.disclosure")}</footer>
    </main>
  );
}
