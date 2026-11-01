import { Globe2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import styles from "@/pages/dashboard/DashboardPage.module.css";
import type { MarketEventSnapshot } from "@/types/market";

interface EventTimelineProps { events: MarketEventSnapshot[] }

export function EventTimeline({ events }: EventTimelineProps) {
  const { i18n, t } = useTranslation();
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" });
  const percent = new Intl.NumberFormat(i18n.language, { style: "percent", maximumFractionDigits: 0 });

  return (
    <section className={styles.eventPanel} aria-labelledby="event-timeline-title">
      <header className={styles.marketHeader}>
        <div><span className={styles.cardEyebrow}>{t("dashboard.contextEyebrow")}</span><h2 id="event-timeline-title">{t("dashboard.contextTitle")}</h2></div>
        <Globe2 aria-hidden="true" size="var(--icon-size-lg)" />
      </header>
      {events.length === 0 ? <p className={styles.marketEmpty}>{t("dashboard.noEvents")}</p> : (
        <ol className={styles.eventList}>
          {events.map((event) => (
            <li className={styles.eventItem} key={`${event.id}:${event.asset.id}`}>
              <span className={styles.eventMarker} aria-hidden="true" />
              <article>
                <div className={styles.eventMeta}>
                  <span>{t(`dashboard.eventType.${event.eventType}`)}</span>
                  <time dateTime={event.startedAt}>{date.format(new Date(event.startedAt))}</time>
                  {event.countryCode ? <span>{event.countryCode}</span> : null}
                </div>
                <h3>{event.title}</h3>
                <p>{event.observedFact}</p>
                <div className={styles.eventRelation}>
                  <strong>{event.asset.symbol}</strong>
                  <span>{t(`dashboard.relationType.${event.relationType}`)}</span>
                  <span>{percent.format(event.confidence)}</span>
                </div>
                <small>{t("dashboard.eventRationale", {
                  eventType: t(`dashboard.eventType.${event.eventType}`).toLocaleLowerCase(i18n.language),
                  symbol: event.asset.symbol,
                  relation: t(`dashboard.relationType.${event.relationType}`).toLocaleLowerCase(i18n.language),
                })}</small>
                <footer>{t("dashboard.sourceLabel", { source: event.sourceName })}</footer>
              </article>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
