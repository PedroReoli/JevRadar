import { RadioTower, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import styles from "@/features/watchlist/Watchlist.module.css";
import type { Watchlist } from "@/types/assets";

interface SelectedAssetsProps {
  watchlist: Watchlist;
  isPending: boolean;
  onRemove: (assetId: string) => void;
}

export function SelectedAssets({ watchlist, isPending, onRemove }: SelectedAssetsProps) {
  const { t } = useTranslation();

  return (
    <section className={styles.panel} aria-labelledby="selected-assets-title">
      <header className={styles.panelHeader}>
        <div>
          <span className={styles.panelEyebrow}>{t("watchlist.monitored")}</span>
          <h2 id="selected-assets-title">{watchlist.name}</h2>
        </div>
        <span className={styles.capacity}>{watchlist.assets.length}/{watchlist.limit}</span>
      </header>

      {watchlist.assets.length === 0 ? (
        <div className={styles.emptyState}>
          <RadioTower aria-hidden="true" size="var(--icon-size-lg)" />
          <p>{t("watchlist.emptyWatchlist")}</p>
        </div>
      ) : (
        <ul className={styles.selectedList}>
          {watchlist.assets.map(({ asset }) => (
            <li className={styles.selectedRow} key={asset.id}>
              <span className={styles.symbol}>{asset.symbol}</span>
              <span className={styles.assetIdentity}>
                <strong>{asset.name}</strong>
                <small>{asset.currency} · {asset.exchange}</small>
              </span>
              <button
                aria-label={t("watchlist.removeAsset", { symbol: asset.symbol })}
                className={styles.removeAction}
                disabled={isPending}
                onClick={() => onRemove(asset.id)}
                type="button"
              >
                <Trash2 aria-hidden="true" size="var(--icon-size-sm)" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
