import { useTranslation } from "react-i18next";

import styles from "@/features/events/EventExplorer.module.css";
import type { Asset } from "@/types/assets";
import type { MarketEventFilter, MarketEventSnapshot } from "@/types/market";

interface EventFiltersProps {
  filter: MarketEventFilter;
  assets: Asset[];
  countries: string[];
  onChange: (key: "type" | "country" | "asset" | "relation" | "confidence", value: string) => void;
}

const eventTypes: MarketEventSnapshot["eventType"][] = ["political", "economic", "regulatory", "climate", "health", "technology", "geopolitical", "other"];
const relationTypes: MarketEventSnapshot["relationType"][] = ["known", "correlation", "hypothesis", "unproven_causality"];

export function EventFilters({ filter, assets, countries, onChange }: EventFiltersProps) {
  const { t } = useTranslation();
  return (
    <section className={styles.filters} aria-label={t("product.events.filters")}>
      <label>{t("product.events.type")}<select onChange={(event) => onChange("type", event.target.value)} value={filter.eventType}><option value="">{t("product.events.allTypes")}</option>{eventTypes.map((value) => <option key={value} value={value}>{t(`dashboard.eventType.${value}`)}</option>)}</select></label>
      <label>{t("product.events.country")}<select onChange={(event) => onChange("country", event.target.value)} value={filter.countryCode}><option value="">{t("product.events.allCountries")}</option>{countries.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      <label>{t("product.events.asset")}<select onChange={(event) => onChange("asset", event.target.value)} value={filter.assetId}><option value="">{t("product.events.allAssets")}</option>{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.symbol} — {asset.name}</option>)}</select></label>
      <label>{t("product.events.relation")}<select onChange={(event) => onChange("relation", event.target.value)} value={filter.relationType}><option value="">{t("product.events.allRelations")}</option>{relationTypes.map((value) => <option key={value} value={value}>{t(`dashboard.relationType.${value}`)}</option>)}</select></label>
      <label>{t("product.events.minimumConfidence")}<select onChange={(event) => onChange("confidence", event.target.value)} value={filter.minimumConfidence}><option value="0">0%</option><option value="0.5">50%</option><option value="0.7">70%</option><option value="0.85">85%</option></select></label>
    </section>
  );
}
