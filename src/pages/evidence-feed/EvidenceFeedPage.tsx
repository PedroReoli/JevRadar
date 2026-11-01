import { Files } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { PageState } from "@/components/product/PageState";
import { EvidenceFeedFilters } from "@/features/evidence-feed/components/EvidenceFeedFilters";
import { EvidenceFeedList } from "@/features/evidence-feed/components/EvidenceFeedList";
import { EvidenceFeedPagination } from "@/features/evidence-feed/components/EvidenceFeedPagination";
import { useEvidenceFeed } from "@/features/evidence-feed/hooks/useEvidenceFeed";
import styles from "@/styles/ProductPage.module.css";

export function EvidenceFeedPage() {
  const { t } = useTranslation();
  const { feedQuery, filter, updateFilter } = useEvidenceFeed();

  useEffect(() => {
    const totalPages = feedQuery.data?.totalPages;
    if (totalPages && filter.page > totalPages) updateFilter("page", String(totalPages));
  }, [feedQuery.data?.totalPages, filter.page, updateFilter]);

  return (
    <main className={styles.page}>
      <header className={styles.header}><div><span className={styles.eyebrow}>{t("product.feed.eyebrow")}</span><h1>{t("product.feed.title")}</h1><p>{t("product.feed.description")}</p></div><Files aria-hidden="true" size="var(--icon-size-xl)" /></header>
      <EvidenceFeedFilters filter={filter} onChange={updateFilter} />
      {feedQuery.isPending ? <PageState kind="loading" message={t("product.loading")} /> : null}
      {feedQuery.isError ? <PageState actionLabel={t("product.retry")} kind="error" message={t("product.loadError")} onAction={() => void feedQuery.refetch()} /> : null}
      {!feedQuery.isPending && !feedQuery.isError && feedQuery.data?.items.length === 0 ? <PageState kind="empty" message={t("product.feed.empty")} /> : null}
      {feedQuery.data && feedQuery.data.items.length > 0 ? <EvidenceFeedList items={feedQuery.data.items} /> : null}
      {feedQuery.data ? <EvidenceFeedPagination onChange={(page) => updateFilter("page", String(page))} page={feedQuery.data.page} totalItems={feedQuery.data.totalItems} totalPages={feedQuery.data.totalPages} /> : null}
      <footer className={styles.disclosure}>{t("product.feed.disclosure")}</footer>
    </main>
  );
}
