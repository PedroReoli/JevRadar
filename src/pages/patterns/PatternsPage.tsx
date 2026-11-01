import { ChartSpline } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { PageState } from "@/components/product/PageState";
import { PatternFilters } from "@/features/patterns/components/PatternFilters";
import { PatternList } from "@/features/patterns/components/PatternList";
import { PatternPagination } from "@/features/patterns/components/PatternPagination";
import { useHistoricalPatterns } from "@/features/patterns/hooks/useHistoricalPatterns";
import styles from "@/styles/ProductPage.module.css";

export function PatternsPage() {
  const { t } = useTranslation();
  const { patternQuery, filter, updateFilter } = useHistoricalPatterns();

  useEffect(() => {
    const totalPages = patternQuery.data?.totalPages;
    if (totalPages && filter.page > totalPages) updateFilter("page", String(totalPages));
  }, [filter.page, patternQuery.data?.totalPages, updateFilter]);

  return (
    <main className={styles.page}>
      <header className={styles.header}><div><span className={styles.eyebrow}>{t("patterns.eyebrow")}</span><h1>{t("patterns.title")}</h1><p>{t("patterns.description")}</p></div><ChartSpline aria-hidden="true" size="var(--icon-size-xl)" /></header>
      <PatternFilters filter={filter} onChange={updateFilter} />
      {patternQuery.isPending ? <PageState kind="loading" message={t("product.loading")} /> : null}
      {patternQuery.isError ? <PageState actionLabel={t("product.retry")} kind="error" message={t("product.loadError")} onAction={() => void patternQuery.refetch()} /> : null}
      {!patternQuery.isPending && !patternQuery.isError && patternQuery.data?.items.length === 0 ? <PageState kind="empty" message={t("patterns.empty")} /> : null}
      {patternQuery.data && patternQuery.data.items.length > 0 ? <PatternList items={patternQuery.data.items} /> : null}
      {patternQuery.data ? <PatternPagination onChange={(page) => updateFilter("page", String(page))} page={patternQuery.data.page} totalItems={patternQuery.data.totalItems} totalPages={patternQuery.data.totalPages} /> : null}
      <footer className={styles.disclosure}>{t("patterns.disclosure")}</footer>
    </main>
  );
}
