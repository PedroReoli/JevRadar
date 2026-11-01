import { useTranslation } from "react-i18next";

import styles from "@/pages/dashboard/DashboardPage.module.css";
import type { AssetClass } from "@/types/assets";
import type { MarketOverviewFilter } from "@/types/market";

interface RadarFiltersProps {
  filter: MarketOverviewFilter;
  onChange: (key: "periodHours" | "assetClass" | "minimumConfidence", value: number | AssetClass | null) => void;
}

export function RadarFilters({ filter, onChange }: RadarFiltersProps) {
  const { t } = useTranslation();
  return (
    <section className={styles.radarFilters} aria-label={t("dashboard.filters")}>
      <label><span>{t("dashboard.period")}</span><select value={filter.periodHours} onChange={(event) => onChange("periodHours", Number(event.target.value))}>
        {[1, 6, 24, 168, 720].map((hours) => <option key={hours} value={hours}>{t(`dashboard.periodOption.${hours}`)}</option>)}
      </select></label>
      <label><span>{t("dashboard.assetClass")}</span><select value={filter.assetClass ?? "all"} onChange={(event) => onChange("assetClass", event.target.value === "all" ? null : event.target.value as AssetClass)}>
        {(["all", "b3Equity", "b3Fund", "crypto", "macro"] as const).map((value) => <option key={value} value={value}>{t(`watchlist.class.${value}`)}</option>)}
      </select></label>
      <label><span>{t("dashboard.minimumConfidence")}</span><select value={filter.minimumConfidence} onChange={(event) => onChange("minimumConfidence", Number(event.target.value))}>
        {[0, 0.5, 0.7, 0.85].map((value) => <option key={value} value={value}>{t("dashboard.confidenceOption", { value: Math.round(value * 100) })}</option>)}
      </select></label>
    </section>
  );
}
