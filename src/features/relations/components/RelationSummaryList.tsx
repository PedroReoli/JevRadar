import { ArrowRight, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import styles from "@/features/relations/RelationExplorer.module.css";
import type { MarketRelationSummary } from "@/types/market";

interface RelationSummaryListProps { items: MarketRelationSummary[] }

export function RelationSummaryList({ items }: RelationSummaryListProps) {
  const { i18n, t } = useTranslation();
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" });
  const percent = new Intl.NumberFormat(i18n.language, { style: "percent", maximumFractionDigits: 0 });
  return (
    <ol className={styles.list}>
      {items.map((item) => {
        const eventHref = `/events?${new URLSearchParams({
          ...(item.countryCode ? { country: item.countryCode } : {}),
          asset: item.asset.id,
          confidence: "0.5",
        }).toString()}`;
        const breakdown = [
          ["known", item.knownCount],
          ["correlation", item.correlationCount],
          ["hypothesis", item.hypothesisCount],
          ["unproven_causality", item.unprovenCausalityCount],
        ] as const;
        return (
          <li className={styles.item} key={`${item.countryCode ?? "global"}:${item.asset.id}`}>
            <header><div><MapPin aria-hidden="true" size="var(--icon-size-md)" /><span>{item.countryCode ?? t("product.relations.global")}</span><ArrowRight aria-hidden="true" size="var(--icon-size-sm)" /><Link to={`/assets/${encodeURIComponent(item.asset.id)}`}>{item.asset.symbol}</Link></div><strong>{percent.format(item.averageConfidence)}</strong></header>
            <div className={styles.summary}><div><span>{t("product.relations.events")}</span><strong>{item.eventCount}</strong></div><div><span>{t("product.relations.latest")}</span><time dateTime={item.latestEventAt}>{date.format(new Date(item.latestEventAt))}</time></div></div>
            <dl className={styles.breakdown}>{breakdown.map(([relation, count]) => <div key={relation}><dt><span>{t(`dashboard.relationType.${relation}`)}</span><strong>{count}</strong></dt><dd><meter max={Math.max(item.eventCount, 1)} min="0" value={count} /></dd></div>)}</dl>
            <footer><span>{t("product.relations.disclosure")}</span><Link to={eventHref}>{t("product.relations.inspectEvents")}<ArrowRight aria-hidden="true" size="var(--icon-size-sm)" /></Link></footer>
          </li>
        );
      })}
    </ol>
  );
}
