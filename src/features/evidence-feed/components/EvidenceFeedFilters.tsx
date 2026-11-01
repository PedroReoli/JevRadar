import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";

import styles from "@/features/evidence-feed/EvidenceFeed.module.css";
import type { DocumentFeedFilter } from "@/types/content";

interface EvidenceFeedFiltersProps {
  filter: DocumentFeedFilter;
  onChange: (key: "q" | "source" | "type" | "sentiment" | "status" | "confidence", value: string) => void;
}

export function EvidenceFeedFilters({ filter, onChange }: EvidenceFeedFiltersProps) {
  const { t } = useTranslation();

  return (
    <section className={styles.filters} aria-label={t("product.feed.filters")}>
      <label className={styles.searchField}>
        <span>{t("product.feed.search")}</span>
        <div><Search aria-hidden="true" size="var(--icon-size-sm)" /><input maxLength={100} onChange={(event) => onChange("q", event.target.value)} placeholder={t("product.feed.searchPlaceholder")} type="search" value={filter.query} /></div>
      </label>
      <label>{t("product.feed.source")}<select onChange={(event) => onChange("source", event.target.value)} value={filter.sourceKind}><option value="">{t("product.feed.allSources")}</option>{["rss", "reddit", "forum", "x"].map((value) => <option key={value} value={value}>{t(`sources.kind.${value}`)}</option>)}</select></label>
      <label>{t("product.feed.type")}<select onChange={(event) => onChange("type", event.target.value)} value={filter.contentType}><option value="">{t("product.feed.allTypes")}</option>{["news", "opinion", "technical_analysis", "meme", "spam", "uncertain"].map((value) => <option key={value} value={value}>{t(`product.feed.contentType.${value}`)}</option>)}</select></label>
      <label>{t("product.feed.sentiment")}<select onChange={(event) => onChange("sentiment", event.target.value)} value={filter.sentiment}><option value="">{t("product.feed.allSentiments")}</option>{["optimistic", "pessimistic", "neutral", "uncertain"].map((value) => <option key={value} value={value}>{t(`dashboard.sentimentType.${value}`)}</option>)}</select></label>
      <label>{t("product.feed.status")}<select onChange={(event) => onChange("status", event.target.value)} value={filter.analysisStatus}><option value="">{t("product.feed.allStatuses")}</option>{["pending", "classified", "no_asset"].map((value) => <option key={value} value={value}>{t(`product.feed.analysisStatus.${value}`)}</option>)}</select></label>
      <label>{t("product.feed.minimumConfidence")}<select onChange={(event) => onChange("confidence", event.target.value)} value={filter.minimumConfidence}><option value="0">0%</option><option value="0.5">50%</option><option value="0.7">70%</option><option value="0.85">85%</option></select></label>
    </section>
  );
}
