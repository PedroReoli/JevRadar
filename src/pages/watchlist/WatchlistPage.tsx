import { Search } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import { AssetCatalogList } from "@/features/watchlist/components/AssetCatalogList";
import { AssetClassFilter } from "@/features/watchlist/components/AssetClassFilter";
import { SelectedAssets } from "@/features/watchlist/components/SelectedAssets";
import styles from "@/features/watchlist/Watchlist.module.css";
import {
  useAssetCatalog,
  useDefaultWatchlist,
  useWatchlistActions,
} from "@/features/watchlist/hooks/useWatchlist";
import pageStyles from "@/pages/watchlist/WatchlistPage.module.css";
import type { AssetClass } from "@/types/assets";

const supportedClasses = new Set<AssetClass>(["b3Equity", "b3Fund", "crypto", "macro"]);

export function WatchlistPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const classParam = searchParams.get("class") as AssetClass | null;
  const assetClass = classParam && supportedClasses.has(classParam) ? classParam : undefined;
  const catalogQuery = useAssetCatalog(query, assetClass);
  const watchlistQuery = useDefaultWatchlist();
  const actions = useWatchlistActions();
  const selectedIds = useMemo(
    () => new Set(watchlistQuery.data?.assets.map(({ asset }) => asset.id) ?? []),
    [watchlistQuery.data],
  );

  const updateParam = (key: string, value?: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
    actions.resetError();
  };

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
            onChange={(event) => updateParam("q", event.target.value)}
            placeholder={t("watchlist.searchPlaceholder")}
            type="search"
            value={query}
          />
        </label>
        <AssetClassFilter value={assetClass} onChange={(value) => updateParam("class", value)} />
      </div>

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
                assets={catalogQuery.data}
                isPending={actions.isPending}
                onAdd={actions.add}
                selectedIds={selectedIds}
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
