import { ExternalLink, FileClock, FileSearch } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import styles from "@/features/evidence-feed/EvidenceFeed.module.css";
import type { DocumentFeedItem } from "@/types/content";

interface EvidenceFeedListProps {
  items: DocumentFeedItem[];
}

export function EvidenceFeedList({ items }: EvidenceFeedListProps) {
  const { t, i18n } = useTranslation();
  const percent = new Intl.NumberFormat(i18n.language, { style: "percent", maximumFractionDigits: 0 });
  const decimal = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 });
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: "short", timeStyle: "short" });

  return (
    <ol className={styles.feedList}>
      {items.map((item) => (
        <li className={styles.feedItem} key={item.id}>
          <header className={styles.itemHeader}>
            <div className={styles.sourceIdentity}>
              {item.analysisStatus === "pending" ? <FileClock aria-hidden="true" size="var(--icon-size-md)" /> : <FileSearch aria-hidden="true" size="var(--icon-size-md)" />}
              <span>{item.sourceName}</span>
              <small>{date.format(new Date(item.publishedAt))}</small>
            </div>
            <span className={styles.status} data-status={item.analysisStatus}>{t(`product.feed.analysisStatus.${item.analysisStatus}`)}</span>
          </header>
          <div className={styles.itemBody}>
            <h2>{item.title ?? t("product.feed.untitled")}</h2>
            <p>{item.excerpt}</p>
          </div>
          {item.analysisStatus === "classified" ? (
            <dl className={styles.metrics}>
              <div><dt>{t("product.feed.type")}</dt><dd>{item.contentType ? t(`product.feed.contentType.${item.contentType}`) : "—"}</dd></div>
              <div><dt>{t("product.feed.sentiment")}</dt><dd>{item.sentiment ? t(`dashboard.sentimentType.${item.sentiment}`) : "—"}</dd></div>
              <div><dt>{t("product.confidence")}</dt><dd>{item.confidence === null ? "—" : percent.format(item.confidence)}</dd></div>
              <div><dt>{t("dashboard.relevance")}</dt><dd>{item.relevanceExpected === null ? "—" : `${decimal.format(item.relevanceExpected)} / 3`}</dd></div>
              <div><dt>{t("dashboard.hype")}</dt><dd>{item.hypeProbability === null ? "—" : percent.format(item.hypeProbability)}</dd></div>
              <div><dt>{t("dashboard.factualClaim")}</dt><dd>{item.factualClaimProbability === null ? "—" : percent.format(item.factualClaimProbability)}</dd></div>
            </dl>
          ) : null}
          <footer className={styles.itemFooter}>
            <div>
              {item.asset ? <Link to={`/assets/${encodeURIComponent(item.asset.id)}`}>{item.asset.symbol}</Link> : null}
              {item.language ? <span>{item.language}</span> : null}
              {item.modelVersion ? <span>{item.modelVersion}</span> : null}
            </div>
            {item.canonicalUrl ? <a aria-label={t("product.feed.openSource")} href={item.canonicalUrl} rel="noreferrer" target="_blank"><ExternalLink aria-hidden="true" size="var(--icon-size-sm)" />{t("product.feed.openSource")}</a> : null}
          </footer>
        </li>
      ))}
    </ol>
  );
}
