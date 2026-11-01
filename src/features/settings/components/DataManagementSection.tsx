import { Download, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { SettingsSection } from "@/features/settings/components/SettingsSection";
import styles from "@/features/settings/SettingsForm.module.css";
import { useExportLocalData, usePurgeLocalData } from "@/features/settings/hooks/useDataManagement";

export function DataManagementSection() {
  const { t } = useTranslation();
  const exportMutation = useExportLocalData();
  const purgeMutation = usePurgeLocalData();
  const [confirming, setConfirming] = useState(false);

  const purge = async () => {
    await purgeMutation.mutateAsync();
    setConfirming(false);
  };

  return (
    <SettingsSection
      description={t("settings.dataDescription")}
      icon={<Download size="var(--icon-size-lg)" />}
      id="data-management-title"
      title={t("settings.dataTitle")}
    >
      <div className={styles.dataActions}>
        <div>
          <strong>{t("settings.exportTitle")}</strong>
          <small>{t("settings.exportDescription")}</small>
          {exportMutation.data ? <code>{exportMutation.data}</code> : null}
        </div>
        <button className={styles.secondaryButton} disabled={exportMutation.isPending} onClick={() => exportMutation.mutate()} type="button">
          <Download aria-hidden="true" size="var(--icon-size-sm)" />
          {exportMutation.isPending ? t("settings.exporting") : t("settings.export")}
        </button>
      </div>
      <div className={styles.dataActions}>
        <div>
          <strong>{t("settings.purgeTitle")}</strong>
          <small>{t("settings.purgeDescription")}</small>
        </div>
        <button className={styles.dangerButton} disabled={purgeMutation.isPending} onClick={() => setConfirming(true)} type="button">
          <Trash2 aria-hidden="true" size="var(--icon-size-sm)" />
          {t("settings.purge")}
        </button>
      </div>
      {confirming ? (
        <div className={styles.confirmation} role="alertdialog" aria-labelledby="purge-confirmation-title">
          <span id="purge-confirmation-title">{t("settings.purgeConfirmation")}</span>
          <button className={styles.ghostButton} onClick={() => setConfirming(false)} type="button">{t("settings.cancel")}</button>
          <button className={styles.dangerButton} disabled={purgeMutation.isPending} onClick={() => void purge()} type="button">
            {purgeMutation.isPending ? t("settings.purging") : t("settings.confirmPurge")}
          </button>
        </div>
      ) : null}
      {exportMutation.isError || purgeMutation.isError ? <p className={styles.fieldError} role="alert">{t("settings.dataError")}</p> : null}
    </SettingsSection>
  );
}
