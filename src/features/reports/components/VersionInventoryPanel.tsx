import { Blocks } from "lucide-react";
import { useTranslation } from "react-i18next";

import styles from "@/styles/ProductPage.module.css";
import type { ReportVersionInventory } from "@/types/report";

interface VersionInventoryPanelProps { versions: ReportVersionInventory }

function VersionList({ items }: { items: string[] }) {
  const { t } = useTranslation();
  return items.length ? <div className={styles.tags}>{items.map((item) => <span className={styles.tag} key={item}>{item}</span>)}</div> : <span>{t("product.reports.noVersions")}</span>;
}

export function VersionInventoryPanel({ versions }: VersionInventoryPanelProps) {
  const { t } = useTranslation();
  return <section className={styles.panel}>
    <header className={styles.panelHeader}><div><span className={styles.panelEyebrow}>{t("product.reports.versionEyebrow")}</span><h2>{t("product.reports.versionInventory")}</h2></div><Blocks aria-hidden="true" size="var(--icon-size-lg)" /></header>
    <p>{t("product.reports.versionDescription")}</p>
    <dl className={styles.detailList}>
      <div><dt>{t("product.reports.signalMethodologies")}</dt><dd><VersionList items={versions.signalMethodologyVersions} /></dd></div>
      <div><dt>{t("product.reports.backtestMethodologies")}</dt><dd><VersionList items={versions.backtestMethodologyVersions} /></dd></div>
      <div><dt>{t("product.reports.models")}</dt><dd><VersionList items={versions.modelVersions} /></dd></div>
      <div><dt>{t("product.reports.questions")}</dt><dd><VersionList items={versions.questionVersions} /></dd></div>
    </dl>
  </section>;
}
