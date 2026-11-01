import { ArrowRight, CircleGauge, Database, RadioTower, Server } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { StatusPill } from "@/components/status/StatusPill";
import { useSystemStatus } from "@/hooks/useSystemStatus";
import styles from "@/pages/dashboard/DashboardPage.module.css";
import type { ComponentStatus } from "@/types/system";

interface HealthItemProps {
  icon: typeof Database;
  label: string;
  status: ComponentStatus;
}

function HealthItem({ icon: Icon, label, status }: HealthItemProps) {
  return (
    <li className={styles.healthItem}>
      <span className={styles.healthIcon}>
        <Icon aria-hidden="true" size="var(--icon-size-md)" />
      </span>
      <span className={styles.healthLabel}>{label}</span>
      <StatusPill status={status} />
    </li>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const statusQuery = useSystemStatus();
  const fallbackStatus: ComponentStatus = statusQuery.isPending ? "pending" : "unavailable";
  const status = statusQuery.data;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>{t("dashboard.eyebrow")}</span>
          <h1>{t("dashboard.title")}</h1>
          <p>{t("dashboard.description")}</p>
        </div>
        <span className={styles.runtime}>
          <CircleGauge aria-hidden="true" size="var(--icon-size-sm)" />
          {status?.version ?? "—"}
        </span>
      </header>

      <section className={styles.grid} aria-label={t("dashboard.systemHealth")}>
        <article className={styles.healthCard}>
          <div className={styles.cardHeader}>
            <div>
              <h2>{t("dashboard.systemHealth")}</h2>
              <p>{t("dashboard.systemHealthDescription")}</p>
            </div>
          </div>
          <ul className={styles.healthList}>
            <HealthItem icon={Database} label={t("dashboard.database")} status={status?.database ?? fallbackStatus} />
            <HealthItem
              icon={RadioTower}
              label={t("dashboard.background")}
              status={status?.backgroundCollection ?? fallbackStatus}
            />
            <HealthItem icon={Server} label={t("dashboard.api")} status={status?.localApi ?? fallbackStatus} />
          </ul>
        </article>

        <article className={styles.emptyCard}>
          <span className={styles.emptySignal} aria-hidden="true">
            <RadioTower size="var(--icon-size-xl)" strokeWidth={1.4} />
          </span>
          <h2>{t("dashboard.noSignalsTitle")}</h2>
          <p>{t("dashboard.noSignalsDescription")}</p>
          <Link className={styles.primaryAction} to="/settings">
            {t("dashboard.openSettings")}
            <ArrowRight aria-hidden="true" size="var(--icon-size-sm)" />
          </Link>
        </article>
      </section>

      <footer className={styles.disclosure}>{t("dashboard.disclosure")}</footer>
    </div>
  );
}
