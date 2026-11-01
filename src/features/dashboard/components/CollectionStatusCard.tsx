import { Clock3, DatabaseZap } from "lucide-react";
import { useTranslation } from "react-i18next";

import styles from "@/pages/dashboard/DashboardPage.module.css";
import type { LatestCollectionRun } from "@/types/market";

interface CollectionStatusCardProps {
  collection: LatestCollectionRun | null;
}

export function CollectionStatusCard({ collection }: CollectionStatusCardProps) {
  const { t, i18n } = useTranslation();
  const completedAt = collection?.completedAt
    ? new Intl.DateTimeFormat(i18n.language, { dateStyle: "short", timeStyle: "short" }).format(
        new Date(collection.completedAt),
      )
    : null;

  return (
    <article className={styles.collectionCard}>
      <span className={styles.collectionIcon}>
        <DatabaseZap aria-hidden="true" size="var(--icon-size-lg)" />
      </span>
      <div>
        <span className={styles.cardEyebrow}>{t("dashboard.latestCollection")}</span>
        <h2>{collection ? t(`dashboard.collectionStatus.${collection.status}`) : t("dashboard.neverCollected")}</h2>
        <p>
          {collection
            ? t("dashboard.collectionSummary", {
                count: collection.storedObservationCount,
                errors: collection.sourceErrorCount,
              })
            : t("dashboard.neverCollectedDescription")}
        </p>
      </div>
      {completedAt ? (
        <span className={styles.collectionTime}>
          <Clock3 aria-hidden="true" size="var(--icon-size-sm)" />
          {completedAt}
        </span>
      ) : null}
    </article>
  );
}
