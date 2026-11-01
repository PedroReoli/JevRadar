import { ExternalLink, FileSearch } from "lucide-react";
import { useTranslation } from "react-i18next";

import styles from "@/pages/dashboard/DashboardPage.module.css";
import type { SignalEvidenceSnapshot } from "@/types/market";

interface SignalEvidencePanelProps {
  evidence: SignalEvidenceSnapshot[];
  isLoading: boolean;
}

export function SignalEvidencePanel({ evidence, isLoading }: SignalEvidencePanelProps) {
  const { i18n, t } = useTranslation();
  const percent = new Intl.NumberFormat(i18n.language, { style: "percent", maximumFractionDigits: 0 });
  const weight = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 3, signDisplay: "exceptZero" });

  return (
    <section className={styles.evidencePanel} aria-labelledby="signal-evidence-title">
      <header className={styles.marketHeader}>
        <div><span className={styles.cardEyebrow}>{t("dashboard.evidenceEyebrow")}</span><h2 id="signal-evidence-title">{t("dashboard.evidenceTitle")}</h2></div>
        <FileSearch aria-hidden="true" size="var(--icon-size-lg)" />
      </header>
      {isLoading ? <p className={styles.marketEmpty}>{t("dashboard.evidenceLoading")}</p> : null}
      {!isLoading && evidence.length === 0 ? <p className={styles.marketEmpty}>{t("dashboard.evidenceEmpty")}</p> : null}
      {evidence.length > 0 ? (
        <ol className={styles.evidenceList}>
          {evidence.map((item) => (
            <li key={item.classificationId}>
              <header>
                <div><strong>{item.title ?? item.sourceName}</strong><span>{item.sourceName} · {new Intl.DateTimeFormat(i18n.language, { dateStyle: "short", timeStyle: "short" }).format(new Date(item.publishedAt))}</span></div>
                {item.canonicalUrl ? <a aria-label={t("dashboard.openEvidenceSource")} href={item.canonicalUrl} rel="noreferrer" target="_blank"><ExternalLink size="var(--icon-size-sm)" /></a> : null}
              </header>
              <p>{item.excerpt}</p>
              <dl>
                <div><dt>{t("dashboard.contribution")}</dt><dd>{weight.format(item.contributionWeight)}</dd></div>
                <div><dt>{t("dashboard.sentiment")}</dt><dd>{t(`dashboard.sentimentType.${item.sentiment}`)} · {percent.format(item.sentimentProbability)}</dd></div>
                <div><dt>{t("dashboard.relevance")}</dt><dd>{item.relevanceExpected.toFixed(2)} / 3</dd></div>
                <div><dt>{t("dashboard.confidence")}</dt><dd>{percent.format(item.confidence)}</dd></div>
                <div><dt>{t("dashboard.hype")}</dt><dd>{percent.format(item.hypeProbability)}</dd></div>
                <div><dt>{t("dashboard.factualClaim")}</dt><dd>{percent.format(item.factualClaimProbability)}</dd></div>
                <div><dt>{t("dashboard.sourceCredibility")}</dt><dd>{percent.format(item.sourceCredibility)}</dd></div>
                <div><dt>{t("dashboard.recencyFactor")}</dt><dd>{percent.format(item.recencyFactor)}</dd></div>
                <div><dt>{t("dashboard.diversityFactor")}</dt><dd>{percent.format(item.diversityFactor)}</dd></div>
              </dl>
              <footer>{t("dashboard.evidenceVersion", { model: item.modelVersion, questions: item.questionVersion })}</footer>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
