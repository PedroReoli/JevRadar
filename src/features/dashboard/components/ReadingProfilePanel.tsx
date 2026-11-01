import { Settings2, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import styles from "@/features/dashboard/components/ReadingProfilePanel.module.css";
import type { ExperienceLevel, InvestmentRange } from "@/types/settings";

interface ReadingProfilePanelProps {
  experienceLevel: ExperienceLevel;
  investmentRange: InvestmentRange;
}

export function ReadingProfilePanel({ experienceLevel, investmentRange }: ReadingProfilePanelProps) {
  const { t } = useTranslation();

  return (
    <aside className={styles.panel} aria-labelledby="reading-profile-title">
      <span className={styles.icon} aria-hidden="true"><UserRound size="var(--icon-size-lg)" /></span>
      <div className={styles.content}>
        <span>{t("dashboard.readingProfileEyebrow")}</span>
        <h2 id="reading-profile-title">{t(`dashboard.readingProfile.${experienceLevel}.title`)}</h2>
        <p>{t(`dashboard.readingProfile.${experienceLevel}.description`)}</p>
        <small>{t(`dashboard.investmentContext.${investmentRange}`)} {t("dashboard.profileInvariant")}</small>
      </div>
      <Link className={styles.action} to="/settings">
        <Settings2 aria-hidden="true" size="var(--icon-size-sm)" />
        {t("dashboard.adjustProfile")}
      </Link>
    </aside>
  );
}
