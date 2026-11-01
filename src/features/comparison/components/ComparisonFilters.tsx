import { useTranslation } from "react-i18next";

import styles from "@/features/comparison/Comparison.module.css";
import type { Asset } from "@/types/assets";
import type { MarketContextFilter } from "@/types/market";

interface ComparisonFiltersProps {
  assets: Asset[];
  maximumAssets: number;
  minimumConfidence: MarketContextFilter["minimumConfidence"];
  onFilterChange: (key: "period" | "confidence", value: string) => void;
  onToggleAsset: (assetId: string) => void;
  periodHours: MarketContextFilter["periodHours"];
  selectedIds: string[];
}

export function ComparisonFilters({ assets, maximumAssets, minimumConfidence, onFilterChange, onToggleAsset, periodHours, selectedIds }: ComparisonFiltersProps) {
  const { t } = useTranslation();
  const limitReached = selectedIds.length >= maximumAssets;
  return (
    <section className={styles.filters} aria-labelledby="comparison-filters-title">
      <header><div><h2 id="comparison-filters-title">{t("product.comparison.filters")}</h2><p>{t("product.comparison.selectionHelp", { maximum: maximumAssets })}</p></div><strong>{t("product.comparison.selectedCount", { count: selectedIds.length, maximum: maximumAssets })}</strong></header>
      <div className={styles.selectFilters}>
        <label><span>{t("product.comparison.period")}</span><select onChange={(event) => onFilterChange("period", event.target.value)} value={periodHours}><option value="24">24h</option><option value="168">7d</option><option value="720">30d</option></select></label>
        <label><span>{t("product.comparison.minimumConfidence")}</span><select onChange={(event) => onFilterChange("confidence", event.target.value)} value={minimumConfidence}><option value="0">0%</option><option value="0.5">50%</option><option value="0.7">70%</option><option value="0.85">85%</option></select></label>
      </div>
      <fieldset className={styles.assetChoices}>
        <legend>{t("product.comparison.assets")}</legend>
        {assets.map((asset) => {
          const checked = selectedIds.includes(asset.id);
          return <label key={asset.id}><input checked={checked} disabled={!checked && limitReached} onChange={() => onToggleAsset(asset.id)} type="checkbox" /><span><strong>{asset.symbol}</strong><small>{asset.name}</small></span></label>;
        })}
      </fieldset>
    </section>
  );
}
