import { Network } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { PageState } from "@/components/product/PageState";
import { RelationFilters } from "@/features/relations/components/RelationFilters";
import { RelationPagination } from "@/features/relations/components/RelationPagination";
import { RelationSummaryList } from "@/features/relations/components/RelationSummaryList";
import { useRelationExplorer } from "@/features/relations/hooks/useRelationExplorer";
import styles from "@/styles/ProductPage.module.css";

export function RelationsPage() {
  const { t } = useTranslation();
  const { relationQuery, filter, updateFilter } = useRelationExplorer();

  useEffect(() => {
    const totalPages = relationQuery.data?.totalPages;
    if (totalPages && filter.page > totalPages) updateFilter("page", String(totalPages));
  }, [filter.page, relationQuery.data?.totalPages, updateFilter]);

  return (
    <main className={styles.page}>
      <header className={styles.header}><div><span className={styles.eyebrow}>{t("product.relations.eyebrow")}</span><h1>{t("product.relations.title")}</h1><p>{t("product.relations.description")}</p></div><Network aria-hidden="true" size="var(--icon-size-xl)" /></header>
      <RelationFilters countries={relationQuery.data?.availableCountries ?? []} filter={filter} onChange={updateFilter} />
      {relationQuery.isPending ? <PageState kind="loading" message={t("product.loading")} /> : null}
      {relationQuery.isError ? <PageState actionLabel={t("product.retry")} kind="error" message={t("product.loadError")} onAction={() => void relationQuery.refetch()} /> : null}
      {!relationQuery.isPending && !relationQuery.isError && relationQuery.data?.items.length === 0 ? <PageState kind="empty" message={t("product.relations.empty")} /> : null}
      {relationQuery.data && relationQuery.data.items.length > 0 ? <RelationSummaryList items={relationQuery.data.items} /> : null}
      {relationQuery.data ? <RelationPagination onChange={(page) => updateFilter("page", String(page))} page={relationQuery.data.page} totalItems={relationQuery.data.totalItems} totalPages={relationQuery.data.totalPages} /> : null}
      <footer className={styles.disclosure}>{t("product.disclosure")}</footer>
    </main>
  );
}
