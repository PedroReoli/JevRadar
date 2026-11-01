import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import styles from "@/features/coverage/CoverageGaps.module.css";
import type { CoverageGapItem } from "@/types/coverage";

interface CoverageGapListProps { items: CoverageGapItem[] }

export function CoverageGapList({ items }: CoverageGapListProps) {
  const { i18n, t } = useTranslation();
  const percent = new Intl.NumberFormat(i18n.language, { style: "percent", maximumFractionDigits: 2, signDisplay: "exceptZero" });
  const money = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 4 });
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: "short", timeStyle: "short" });
  return (
    <ol className={styles.list}>
      {items.map((item) => (
        <li className={styles.item} key={item.asset.id}>
          <header><div><Link to={`/assets/${encodeURIComponent(item.asset.id)}`}>{item.asset.symbol}</Link><span>{item.asset.name}</span></div><strong data-direction={item.changePercent >= 0 ? "positive" : "negative"}>{percent.format(item.changePercent / 100)}</strong></header>
          <dl><div><dt>{t("coverage.latestPrice")}</dt><dd>{money.format(item.closeValue)} {item.asset.currency}</dd></div><div><dt>{t("coverage.evidence")}</dt><dd>{item.evidenceCount}</dd></div><div><dt>{t("coverage.independentSources")}</dt><dd>{item.independentSourceCount}</dd></div><div><dt>{t("coverage.observedAt")}</dt><dd>{date.format(new Date(item.observedAt))}</dd></div></dl>
          <footer>{t("coverage.marketSource", { source: item.marketSourceName })}</footer>
        </li>
      ))}
    </ol>
  );
}
