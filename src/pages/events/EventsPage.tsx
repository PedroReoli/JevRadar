import { Globe2 } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { PageState } from "@/components/product/PageState";
import { EventExplorerList } from "@/features/events/components/EventExplorerList";
import { EventFilters } from "@/features/events/components/EventFilters";
import { EventPagination } from "@/features/events/components/EventPagination";
import { useEventExplorer } from "@/features/events/hooks/useEventExplorer";
import styles from "@/styles/ProductPage.module.css";

export function EventsPage() {
  const { t } = useTranslation();
  const { eventQuery, filter, updateFilter } = useEventExplorer();

  useEffect(() => {
    const totalPages = eventQuery.data?.totalPages;
    if (totalPages && filter.page > totalPages) updateFilter("page", String(totalPages));
  }, [eventQuery.data?.totalPages, filter.page, updateFilter]);

  return (
    <main className={styles.page}>
      <header className={styles.header}><div><span className={styles.eyebrow}>{t("product.events.eyebrow")}</span><h1>{t("product.events.title")}</h1><p>{t("product.events.description")}</p></div><Globe2 aria-hidden="true" size="var(--icon-size-xl)" /></header>
      <EventFilters assets={eventQuery.data?.availableAssets ?? []} countries={eventQuery.data?.availableCountries ?? []} filter={filter} onChange={updateFilter} />
      {eventQuery.isPending ? <PageState kind="loading" message={t("product.loading")} /> : null}
      {eventQuery.isError ? <PageState actionLabel={t("product.retry")} kind="error" message={t("product.loadError")} onAction={() => void eventQuery.refetch()} /> : null}
      {!eventQuery.isPending && !eventQuery.isError && eventQuery.data?.items.length === 0 ? <PageState kind="empty" message={t("product.events.empty")} /> : null}
      {eventQuery.data && eventQuery.data.items.length > 0 ? <EventExplorerList items={eventQuery.data.items} /> : null}
      {eventQuery.data ? <EventPagination onChange={(page) => updateFilter("page", String(page))} page={eventQuery.data.page} totalItems={eventQuery.data.totalItems} totalPages={eventQuery.data.totalPages} /> : null}
      <footer className={styles.disclosure}>{t("product.disclosure")}</footer>
    </main>
  );
}
