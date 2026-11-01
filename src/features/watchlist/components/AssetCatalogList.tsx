import { Plus, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

import styles from "@/features/watchlist/Watchlist.module.css";
import type { Asset } from "@/types/assets";

interface AssetCatalogListProps {
  assets: Asset[];
  selectedIds: Set<string>;
  isPending: boolean;
  onAdd: (assetId: string) => void;
}

export function AssetCatalogList({ assets, selectedIds, isPending, onAdd }: AssetCatalogListProps) {
  const { t } = useTranslation();

  if (assets.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Search aria-hidden="true" size="var(--icon-size-lg)" />
        <p>{t("watchlist.noAssets")}</p>
      </div>
    );
  }

  return (
    <ul className={styles.assetList}>
      {assets.map((asset) => {
        const selected = selectedIds.has(asset.id);
        return (
          <li className={styles.assetRow} key={asset.id}>
            <span className={styles.symbol}>{asset.symbol}</span>
            <span className={styles.assetIdentity}>
              <strong>{asset.name}</strong>
              <small>{t(`watchlist.class.${asset.assetClass}`)} · {asset.exchange}</small>
            </span>
            <button
              className={styles.iconAction}
              disabled={selected || isPending}
              onClick={() => onAdd(asset.id)}
              type="button"
            >
              <Plus aria-hidden="true" size="var(--icon-size-sm)" />
              {selected ? t("watchlist.added") : t("watchlist.add")}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
