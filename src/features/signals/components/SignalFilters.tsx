import { useTranslation } from "react-i18next";

import styles from "@/features/signals/Signals.module.css";
import type { SignalExplorerState } from "@/features/signals/types";

interface SignalFiltersProps {
  state: SignalExplorerState;
  onChange: (key: "period" | "confidence" | "direction" | "asset", value: string) => void;
}

export function SignalFilters({ state, onChange }: SignalFiltersProps) {
  const { t } = useTranslation();
  const { filters } = state;

  return (
    <section className={styles.filters} aria-label={t("product.signals.filters")}>
      <label>
        {t("product.signals.period")}
        <select value={filters.periodHours} onChange={(event) => onChange("period", event.target.value)}>
          <option value="24">{t("dashboard.periodOption.24")}</option>
          <option value="168">{t("dashboard.periodOption.168")}</option>
          <option value="720">{t("dashboard.periodOption.720")}</option>
        </select>
      </label>
      <label>
        {t("product.signals.direction")}
        <select value={filters.direction} onChange={(event) => onChange("direction", event.target.value)}>
          <option value="all">{t("product.signals.allDirections")}</option>
          <option value="positive">{t("dashboard.signalTone.positive")}</option>
          <option value="neutral">{t("dashboard.signalTone.neutral")}</option>
          <option value="negative">{t("dashboard.signalTone.negative")}</option>
        </select>
      </label>
      <label>
        {t("product.signals.asset")}
        <select value={filters.assetId} onChange={(event) => onChange("asset", event.target.value)}>
          <option value="">{t("product.signals.allAssets")}</option>
          {state.assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.symbol}</option>)}
        </select>
      </label>
      <label>
        {t("product.signals.minimumConfidence")}
        <select value={filters.minimumConfidence} onChange={(event) => onChange("confidence", event.target.value)}>
          <option value="0">0%</option>
          <option value="0.5">50%</option>
          <option value="0.7">70%</option>
          <option value="0.85">85%</option>
        </select>
      </label>
    </section>
  );
}
