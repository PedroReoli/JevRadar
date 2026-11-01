import { RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import { AssetCatalogList } from "@/features/watchlist/components/AssetCatalogList";
import { AssetClassFilter } from "@/features/watchlist/components/AssetClassFilter";
import { CatalogPagination } from "@/features/watchlist/components/CatalogPagination";
import { SelectedAssets } from "@/features/watchlist/components/SelectedAssets";
import styles from "@/features/watchlist/Watchlist.module.css";
import {
  useAssetCatalog,
  useCatalogRefresh,
  useDefaultWatchlist,
  useWatchlistActions,
} from "@/features/watchlist/hooks/useWatchlist";
import pageStyles from "@/pages/watchlist/WatchlistPage.module.css";
import type { AssetClass } from "@/types/assets";

const supportedClasses = new Set<AssetClass>(["b3Equity", "b3Fund", "crypto", "macro"]);
const defaultPage = 1;

function readPage(value: string | null) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : defaultPage;
}

export function WatchlistPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const classParam = searchParams.get("class") as AssetClass | null;
  const assetClass = classParam && supportedClasses.has(classParam) ? classParam : undefined;
  const page = readPage(searchParams.get("page"));
  const catalogQuery = useAssetCatalog(query, assetClass, page);
  const watchlistQuery = useDefaultWatchlist();
  const actions = useWatchlistActions();
  const catalogRefresh = useCatalogRefresh();
  const selectedIds = useMemo(
    () => new Set(watchlistQuery.data?.assets.map(({ asset }) => asset.id) ?? []),
    [watchlistQuery.data],
  );

  const updateParam = (key: string, value?: string, resetPage = false) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (resetPage) next.delete("page");
    setSearchParams(next, { replace: true });
    actions.resetError();
  };

  useEffect(() => {
    const totalPages = catalogQuery.data?.totalPages;
    if (totalPages && page > totalPages) {
      const next = new URLSearchParams(searchParams);
      next.set("page", String(totalPages));
      setSearchParams(next, { replace: true });
    }
  }, [catalogQuery.data?.totalPages, page, searchParams, setSearchParams]);

  const hasLoadError = catalogQuery.isError || watchlistQuery.isError;

  return (
    <div className={pageStyles.page}>
      <header className={pageStyles.header}>
        <span className={pageStyles.eyebrow}>{t("watchlist.eyebrow")}</span>
        <h1>{t("watchlist.title")}</h1>
        <p>{t("watchlist.description")}</p>
      </header>

      <div className={styles.toolbar}>
        <label className={styles.searchField}>
          <Search aria-hidden="true" size="var(--icon-size-sm)" />
          <input
            aria-label={t("watchlist.searchLabel")}
            maxLength={80}
            onChange={(event) => updateParam("q", event.target.value, true)}
            placeholder={t("watchlist.searchPlaceholder")}
            type="search"
            value={query}
          />
        </label>
        <AssetClassFilter value={assetClass} onChange={(value) => updateParam("class", value, true)} />
        <button
          className={styles.iconAction}
          disabled={catalogRefresh.isPending}
          onClick={() => catalogRefresh.mutate()}
          type="button"
        >
          <RefreshCw aria-hidden="true" size="var(--icon-size-sm)" />
          {catalogRefresh.isPending ? t("watchlist.syncingCatalog") : t("watchlist.syncCatalog")}
        </button>
      </div>

      {catalogRefresh.data ? (
        <p className={pageStyles.statusMessage} role="status">
          {t("watchlist.syncResult", {
            count: catalogRefresh.data.upsertedCount,
            errors: catalogRefresh.data.sources.filter((source) => source.status === "failed").length,
          })}
        </p>
      ) : null}
      {catalogRefresh.isError ? <div className={pageStyles.errorMessage} role="alert">{t("watchlist.syncError")}</div> : null}

      {hasLoadError ? (
        <div className={pageStyles.errorMessage} role="alert">{t("watchlist.loadError")}</div>
      ) : catalogQuery.isPending || watchlistQuery.isPending ? (
        <p className={pageStyles.statusMessage}>{t("watchlist.loading")}</p>
      ) : catalogQuery.data && watchlistQuery.data ? (
        <div className={pageStyles.grid}>
          <section className={pageStyles.catalog} aria-label={t("watchlist.catalog")}>
            {actions.error ? <div className={pageStyles.errorMessage} role="alert">{t("watchlist.actionError")}</div> : null}
            <div className={styles.panel}>
              <AssetCatalogList
                assets={catalogQuery.data.items}
                isPending={actions.isPending}
                onAdd={actions.add}
                selectedIds={selectedIds}
              />
              <CatalogPagination
                onPageChange={(nextPage) => updateParam("page", nextPage === defaultPage ? undefined : String(nextPage))}
                page={catalogQuery.data.page}
                pageSize={catalogQuery.data.pageSize}
                totalItems={catalogQuery.data.totalItems}
                totalPages={catalogQuery.data.totalPages}
              />
            </div>
          </section>
          <SelectedAssets
            isPending={actions.isPending}
            onRemove={actions.remove}
            watchlist={watchlistQuery.data}
          />
        </div>
      ) : null}
    </div>
  );
}
