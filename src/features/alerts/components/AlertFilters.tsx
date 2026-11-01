import { useTranslation } from "react-i18next";

import styles from "@/styles/ProductPage.module.css";
import type { Asset } from "@/types/assets";
import type { AlertLevel } from "@/types/insights";

interface AlertFiltersProps {
  alertLevel: AlertLevel | null;
  assetId: string | null;
  assets: Asset[];
  onChange: (key: "level" | "asset", value: string) => void;
}

export function AlertFilters({ alertLevel, assetId, assets, onChange }: AlertFiltersProps) {
  const { t } = useTranslation();
  return <section className={styles.filters} aria-label={t("product.alerts.filters")}>
    <label>{t("product.alerts.level")}<select onChange={(event) => onChange("level", event.target.value)} value={alertLevel ?? ""}><option value="">{t("product.alerts.allLevels")}</option>{[1, 2, 3, 4].map((value) => <option key={value} value={value}>{t("product.alerts.levelLabel", { level: value })}</option>)}</select></label>
    <label>{t("product.alerts.asset")}<select onChange={(event) => onChange("asset", event.target.value)} value={assetId ?? ""}><option value="">{t("product.alerts.allAssets")}</option>{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.symbol} · {asset.name}</option>)}</select></label>
  </section>;
}
