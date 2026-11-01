import { EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";

import styles from "@/pages/dashboard/DashboardPage.module.css";
import type { MarketSignalSnapshot, MarketSnapshot } from "@/types/market";

interface LowAttentionPanelProps {
  signals: MarketSignalSnapshot[];
  snapshots: MarketSnapshot[];
}

export function LowAttentionPanel({ signals, snapshots }: LowAttentionPanelProps) {
  const { i18n, t } = useTranslation();
  const assetsWithEvidence = new Set(signals.filter((signal) => signal.evidenceCount > 0).map((signal) => signal.asset.id));
  const candidates = snapshots.filter((snapshot) =>
    Math.abs(snapshot.changePercent ?? 0) >= 2 && !assetsWithEvidence.has(snapshot.asset.id),
  );
  const percent = new Intl.NumberFormat(i18n.language, { style: "percent", maximumFractionDigits: 2, signDisplay: "exceptZero" });

  return (
    <section className={styles.attentionPanel} aria-labelledby="low-attention-title">
      <header className={styles.marketHeader}>
        <div>
          <span className={styles.cardEyebrow}>{t("dashboard.lowAttentionEyebrow")}</span>
          <h2 id="low-attention-title">{t("dashboard.lowAttentionTitle")}</h2>
        </div>
        <EyeOff aria-hidden="true" size="var(--icon-size-lg)" />
      </header>
      {candidates.length === 0 ? <p className={styles.marketEmpty}>{t("dashboard.lowAttentionEmpty")}</p> : (
        <ul className={styles.attentionList}>
          {candidates.map((snapshot) => (
            <li key={snapshot.asset.id}>
              <span><strong>{snapshot.asset.symbol}</strong>{snapshot.asset.name}</span>
              <strong>{percent.format((snapshot.changePercent ?? 0) / 100)}</strong>
            </li>
          ))}
        </ul>
      )}
      <p className={styles.attentionDisclosure}>{t("dashboard.lowAttentionDisclosure")}</p>
    </section>
  );
}
