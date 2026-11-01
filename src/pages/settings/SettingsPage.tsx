import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SettingsForm } from "@/features/settings/components/SettingsForm";
import { useAppSettingsQuery, useSecretStatusQuery } from "@/hooks/useAppSettings";
import styles from "@/pages/settings/SettingsPage.module.css";

export function SettingsPage() {
  const { t } = useTranslation();
  const settingsQuery = useAppSettingsQuery();
  const secretStatusQuery = useSecretStatusQuery();
  const isLoading = settingsQuery.isLoading || secretStatusQuery.isLoading;
  const hasError = settingsQuery.isError || secretStatusQuery.isError;

  const retry = () => {
    void settingsQuery.refetch();
    void secretStatusQuery.refetch();
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span>{t("settings.eyebrow")}</span>
        <h1>{t("settings.title")}</h1>
        <p>{t("settings.description")}</p>
      </header>

      {isLoading && <div className={styles.state} role="status">{t("settings.loading")}</div>}

      {hasError && (
        <div className={styles.errorState} role="alert">
          <div>
            <strong>{t("settings.loadErrorTitle")}</strong>
            <span>{t("settings.loadErrorDescription")}</span>
          </div>
          <button onClick={retry} type="button">
            <RefreshCw aria-hidden="true" size="var(--icon-size-sm)" />
            {t("bootstrap.retry")}
          </button>
        </div>
      )}

      {settingsQuery.data && secretStatusQuery.data && (
        <SettingsForm settings={settingsQuery.data} secretStatus={secretStatusQuery.data} />
      )}
    </div>
  );
}
