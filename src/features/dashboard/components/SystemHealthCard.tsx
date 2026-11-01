import { Database, RadioTower, Server } from "lucide-react";
import { useTranslation } from "react-i18next";

import { StatusPill } from "@/components/status/StatusPill";
import styles from "@/pages/dashboard/DashboardPage.module.css";
import type { ComponentStatus, SystemStatus } from "@/types/system";

interface SystemHealthCardProps {
  status?: SystemStatus;
  fallbackStatus: ComponentStatus;
}

const healthItems = [
  { key: "database", icon: Database, labelKey: "dashboard.database" },
  { key: "backgroundCollection", icon: RadioTower, labelKey: "dashboard.background" },
  { key: "localApi", icon: Server, labelKey: "dashboard.api" },
] as const;

export function SystemHealthCard({ status, fallbackStatus }: SystemHealthCardProps) {
  const { t } = useTranslation();
  return (
    <article className={styles.healthCard}>
      <header className={styles.cardHeader}>
        <div>
          <h2>{t("dashboard.systemHealth")}</h2>
          <p>{t("dashboard.systemHealthDescription")}</p>
        </div>
      </header>
      <ul className={styles.healthList}>
        {healthItems.map(({ key, icon: Icon, labelKey }) => (
          <li className={styles.healthItem} key={key}>
            <span className={styles.healthIcon}>
              <Icon aria-hidden="true" size="var(--icon-size-md)" />
            </span>
            <span className={styles.healthLabel}>{t(labelKey)}</span>
            <StatusPill status={status?.[key] ?? fallbackStatus} />
          </li>
        ))}
      </ul>
    </article>
  );
}
