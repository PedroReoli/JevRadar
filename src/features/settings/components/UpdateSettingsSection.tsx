import { DownloadCloud, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SettingsSection } from "@/features/settings/components/SettingsSection";
import styles from "@/features/settings/SettingsForm.module.css";
import { useAppUpdater } from "@/features/settings/hooks/useAppUpdater";

export function UpdateSettingsSection() {
  const { t } = useTranslation();
  const { checkNow, install, state } = useAppUpdater();
  const pending = state.phase === "checking" || state.phase === "installing";

  return (
    <SettingsSection
      description={t("settings.updateDescription")}
      icon={<DownloadCloud size="var(--icon-size-lg)" />}
      id="application-update-title"
      title={t("settings.updateTitle")}
    >
      <div className={styles.dataActions}>
        <div aria-live="polite">
          <strong>{state.version ? t("settings.updateAvailable", { version: state.version }) : t(`settings.updateStatus.${state.phase}`)}</strong>
          <small>{state.notes || t("settings.updateHint")}</small>
          {state.phase === "installing" ? (
            <progress aria-label={t("settings.updateProgress")} className={styles.updateProgress} max="100" value={state.progress ?? undefined} />
          ) : null}
        </div>
        {state.phase === "available" ? (
          <button className={styles.primaryButton} onClick={() => void install()} type="button">
            <DownloadCloud aria-hidden="true" size="var(--icon-size-sm)" />
            {t("settings.installUpdate")}
          </button>
        ) : (
          <button className={styles.secondaryButton} disabled={pending} onClick={() => void checkNow()} type="button">
            <RefreshCw aria-hidden="true" size="var(--icon-size-sm)" />
            {state.phase === "checking" ? t("settings.checkingUpdate") : t("settings.checkUpdate")}
          </button>
        )}
      </div>
    </SettingsSection>
  );
}
