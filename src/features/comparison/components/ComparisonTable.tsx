import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import styles from "@/features/comparison/Comparison.module.css";
import type { AssetComparisonRow } from "@/types/comparison";

interface ComparisonTableProps { rows: AssetComparisonRow[] }

export function ComparisonTable({ rows }: ComparisonTableProps) {
  const { i18n, t } = useTranslation();
  const number = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2, signDisplay: "exceptZero" });
  const percent = new Intl.NumberFormat(i18n.language, { style: "percent", maximumFractionDigits: 0 });
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: "short", timeStyle: "short" });
  const optional = (value: number | null, formatter: (candidate: number) => string) => value === null ? "—" : formatter(value);
  return (
    <section className={styles.tablePanel} aria-labelledby="comparison-table-title">
      <header><div><h2 id="comparison-table-title">{t("product.comparison.tableTitle")}</h2><p>{t("product.comparison.tableDescription")}</p></div></header>
      <div className={styles.tableScroll}>
        <table>
          <thead><tr><th scope="col">{t("product.comparison.asset")}</th><th scope="col">{t("product.comparison.priceChange")}</th><th scope="col">{t("product.comparison.signal")}</th><th scope="col">{t("product.comparison.confidence")}</th><th scope="col">{t("product.comparison.evidence")}</th><th scope="col">{t("product.comparison.sources")}</th><th scope="col">{t("product.comparison.hype")}</th><th scope="col">{t("product.comparison.events")}</th><th scope="col">{t("product.comparison.observedAt")}</th><th scope="col"><span className={styles.visuallyHidden}>{t("product.comparison.openAsset")}</span></th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.asset.id}><th scope="row"><strong>{row.asset.symbol}</strong><span>{row.asset.name}</span></th><td>{optional(row.changePercent, (value) => percent.format(value / 100))}</td><td>{optional(row.signalScore, number.format)}</td><td>{optional(row.confidence, percent.format)}</td><td>{row.evidenceCount ?? "—"}</td><td>{row.independentSourceCount ?? "—"}</td><td>{optional(row.hypePenalty, percent.format)}</td><td>{row.eventCount}</td><td>{row.observedAt ? <><time dateTime={row.observedAt}>{date.format(new Date(row.observedAt))}</time><small>{row.marketSourceName}</small></> : "—"}</td><td><Link aria-label={t("product.comparison.openAssetNamed", { symbol: row.asset.symbol })} to={`/assets/${encodeURIComponent(row.asset.id)}`}><ArrowRight aria-hidden="true" size="var(--icon-size-sm)" /></Link></td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}
