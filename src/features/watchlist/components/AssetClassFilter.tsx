import { useTranslation } from "react-i18next";

import styles from "@/features/watchlist/Watchlist.module.css";
import type { AssetClass } from "@/types/assets";

interface AssetClassFilterProps {
  value?: AssetClass;
  onChange: (value?: AssetClass) => void;
}

const options: Array<AssetClass | undefined> = [undefined, "b3Equity", "b3Fund", "usEquity", "usFund", "crypto", "macro"];

export function AssetClassFilter({ value, onChange }: AssetClassFilterProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.classFilter} role="group" aria-label={t("watchlist.assetClassFilter")}>
      {options.map((option) => (
        <button
          aria-pressed={value === option}
          className={value === option ? styles.filterActive : styles.filterButton}
          key={option ?? "all"}
          onClick={() => onChange(option)}
          type="button"
        >
          {t(`watchlist.class.${option ?? "all"}`)}
        </button>
      ))}
    </div>
  );
}
