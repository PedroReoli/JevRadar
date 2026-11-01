import { useTranslation } from "react-i18next";

import styles from "@/components/status/StatusPill.module.css";
import type { ComponentStatus } from "@/types/system";

interface StatusPillProps {
  status: ComponentStatus;
}

export function StatusPill({ status }: StatusPillProps) {
  const { t } = useTranslation();

  return (
    <span className={styles.pill} data-status={status}>
      <span className={styles.dot} aria-hidden="true" />
      {t(`status.${status}`)}
    </span>
  );
}
