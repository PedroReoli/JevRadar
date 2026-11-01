import { useTranslation } from "react-i18next";

import styles from "@/features/context/MarketContext.module.css";
import type { MarketContextFilter } from "@/types/market";

interface ContextFiltersProps {
  filter: MarketContextFilter;
  onChange: (key: "period" | "confidence", value: string) => void;
}

export function ContextFilters({ filter, onChange }: ContextFiltersProps) {
  const { t } = useTranslation();
  return (
    <fieldset className={styles.filters}>
      <legend>{t("product.context.filters")}</legend>
      <label>
        <span>{t("product.context.period")}</span>
        <select onChange={(event) => onChange("period", event.target.value)} value={filter.periodHours}>
          <option value="24">24h</option>
          <option value="168">7d</option>
          <option value="720">30d</option>
        </select>
      </label>
      <label>
        <span>{t("product.context.minimumConfidence")}</span>
        <select onChange={(event) => onChange("confidence", event.target.value)} value={filter.minimumConfidence}>
          <option value="0">0%</option>
          <option value="0.5">50%</option>
          <option value="0.7">70%</option>
          <option value="0.85">85%</option>
        </select>
      </label>
    </fieldset>
  );
}
