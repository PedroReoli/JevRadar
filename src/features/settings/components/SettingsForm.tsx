import { RotateCcw, Save } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { CredentialsSettingsSection } from "@/features/settings/components/CredentialsSettingsSection";
import { AlertSettingsSection } from "@/features/settings/components/AlertSettingsSection";
import { DataManagementSection } from "@/features/settings/components/DataManagementSection";
import { InterfaceSettingsSection } from "@/features/settings/components/InterfaceSettingsSection";
import { OperationSettingsSection } from "@/features/settings/components/OperationSettingsSection";
import { ProfileSettingsSection } from "@/features/settings/components/ProfileSettingsSection";
import { SourceSettingsSection } from "@/features/settings/components/SourceSettingsSection";
import { UpdateSettingsSection } from "@/features/settings/components/UpdateSettingsSection";
import styles from "@/features/settings/SettingsForm.module.css";
import { useSettingsDraft } from "@/features/settings/hooks/useSettingsDraft";
import { useUpdateAppSettings } from "@/hooks/useAppSettings";
import type { AppSettings, SecretStatus } from "@/types/settings";

interface SettingsFormProps {
  settings: AppSettings;
  secretStatus: SecretStatus;
}

export function SettingsForm({ settings, secretStatus }: SettingsFormProps) {
  const { i18n, t } = useTranslation();
  const { accept, draft, isDirty, reset, update } = useSettingsDraft(settings);
  const mutation = useUpdateAppSettings();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);

  const submit = async () => {
    setError(false);
    setSaved(false);
    try {
      const result = await mutation.mutateAsync(draft);
      await i18n.changeLanguage(result.language);
      accept(result);
      setSaved(true);
    } catch {
      setError(true);
    }
  };

  const handleUpdate: typeof update = (key, value) => {
    setSaved(false);
    setError(false);
    update(key, value);
  };

  return (
    <div className={styles.form}>
      <InterfaceSettingsSection disabled={mutation.isPending} settings={draft} update={handleUpdate} />
      <AlertSettingsSection disabled={mutation.isPending} settings={draft} update={handleUpdate} />
      <OperationSettingsSection disabled={mutation.isPending} settings={draft} update={handleUpdate} />
      <ProfileSettingsSection disabled={mutation.isPending} settings={draft} update={handleUpdate} />
      <SourceSettingsSection disabled={mutation.isPending} settings={draft} update={handleUpdate} />
      <CredentialsSettingsSection status={secretStatus} />
      <UpdateSettingsSection />
      <DataManagementSection />

      <div className={styles.actionBar}>
        <div aria-live="polite">
          {saved && <span className={styles.successMessage}>{t("settings.saved")}</span>}
          {error && <span className={styles.errorMessage} role="alert">{t("settings.saveError")}</span>}
        </div>
        <div className={styles.actions}>
          <button className={styles.ghostButton} disabled={!isDirty || mutation.isPending} onClick={reset} type="button">
            <RotateCcw aria-hidden="true" size="var(--icon-size-sm)" />
            {t("settings.reset")}
          </button>
          <button className={styles.primaryButton} disabled={!isDirty || mutation.isPending} onClick={() => void submit()} type="button">
            <Save aria-hidden="true" size="var(--icon-size-sm)" />
            {mutation.isPending ? t("settings.saving") : t("settings.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
