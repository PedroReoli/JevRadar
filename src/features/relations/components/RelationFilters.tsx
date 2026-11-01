import { useTranslation } from "react-i18next";

import styles from "@/features/relations/RelationExplorer.module.css";
import type { AssetClass } from "@/types/assets";
import type { MarketEventSnapshot, MarketRelationFilter } from "@/types/market";

interface RelationFiltersProps {
  filter: MarketRelationFilter;
  countries: string[];
  onChange: (key: "period" | "country" | "class" | "relation" | "confidence", value: string) => void;
}

const assetClasses: AssetClass[] = ["b3Equity", "b3Fund", "crypto", "macro"];
const relationTypes: MarketEventSnapshot["relationType"][] = ["known", "correlation", "hypothesis", "unproven_causality"];

export function RelationFilters({ filter, countries, onChange }: RelationFiltersProps) {
  const { t } = useTranslation();
  return (
    <section aria-label={t("product.relations.filters")} className={styles.filters}>
      <label>{t("product.relations.period")}<select onChange={(event) => onChange("period", event.target.value)} value={filter.periodHours}><option value="24">24h</option><option value="168">7d</option><option value="720">30d</option></select></label>
      <label>{t("product.relations.country")}<select onChange={(event) => onChange("country", event.target.value)} value={filter.countryCode}><option value="">{t("product.relations.allCountries")}</option>{countries.map((country) => <option key={country} value={country}>{country}</option>)}</select></label>
      <label>{t("product.relations.assetClass")}<select onChange={(event) => onChange("class", event.target.value)} value={filter.assetClass ?? ""}><option value="">{t("product.relations.allClasses")}</option>{assetClasses.map((assetClass) => <option key={assetClass} value={assetClass}>{t(`assetClass.${assetClass}`)}</option>)}</select></label>
      <label>{t("product.relations.relation")}<select onChange={(event) => onChange("relation", event.target.value)} value={filter.relationType}><option value="">{t("product.relations.allRelations")}</option>{relationTypes.map((relation) => <option key={relation} value={relation}>{t(`dashboard.relationType.${relation}`)}</option>)}</select></label>
      <label>{t("product.relations.minimumConfidence")}<select onChange={(event) => onChange("confidence", event.target.value)} value={filter.minimumConfidence}><option value="0">0%</option><option value="0.5">50%</option><option value="0.7">70%</option><option value="0.85">85%</option></select></label>
    </section>
  );
}
