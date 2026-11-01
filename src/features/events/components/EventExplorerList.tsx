import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import styles from "@/features/events/EventExplorer.module.css";
import type { MarketEventSnapshot } from "@/types/market";

interface EventExplorerListProps { items: MarketEventSnapshot[] }

export function EventExplorerList({ items }: EventExplorerListProps) {
  const { i18n, t } = useTranslation();
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" });
  const percent = new Intl.NumberFormat(i18n.language, { style: "percent", maximumFractionDigits: 0 });
  return (
    <ol className={styles.list}>
      {items.map((item) => (
        <li className={styles.item} key={`${item.id}:${item.asset.id}`}>
          <header><div><span>{t(`dashboard.eventType.${item.eventType}`)}</span><time dateTime={item.startedAt}>{date.format(new Date(item.startedAt))}</time>{item.countryCode ? <span>{item.countryCode}</span> : null}</div><strong>{percent.format(item.confidence)}</strong></header>
          <div className={styles.body}><h2>{item.title}</h2><p>{item.observedFact}</p></div>
          <div className={styles.relation}><Link to={`/assets/${encodeURIComponent(item.asset.id)}`}>{item.asset.symbol}</Link><span>{t(`dashboard.relationType.${item.relationType}`)}</span></div>
          <p className={styles.rationale}>{t("dashboard.eventRationale", { eventType: t(`dashboard.eventType.${item.eventType}`).toLocaleLowerCase(i18n.language), symbol: item.asset.symbol, relation: t(`dashboard.relationType.${item.relationType}`).toLocaleLowerCase(i18n.language) })}</p>
          <footer><span>{t("dashboard.sourceLabel", { source: item.sourceName })}</span>{item.sourceUrl ? <a href={item.sourceUrl} rel="noreferrer" target="_blank"><ExternalLink aria-hidden="true" size="var(--icon-size-sm)" />{t("product.events.openSource")}</a> : null}</footer>
        </li>
      ))}
    </ol>
  );
}
