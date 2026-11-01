import { AlertTriangle, LoaderCircle } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { RouterProvider } from "react-router-dom";

import { appRouter } from "@/app/router";
import { SetupWizard } from "@/features/setup/SetupWizard";
import { useAppSettingsQuery } from "@/hooks/useAppSettings";
import styles from "@/app/AppBootstrap.module.css";

export function AppBootstrap() {
  const { i18n, t } = useTranslation();
  const settingsQuery = useAppSettingsQuery();

  useEffect(() => {
    if (settingsQuery.data?.language && i18n.language !== settingsQuery.data.language) {
      void i18n.changeLanguage(settingsQuery.data.language);
    }
  }, [i18n, settingsQuery.data?.language]);

  if (settingsQuery.isPending) {
    return (
      <main className={styles.centered} aria-live="polite">
        <LoaderCircle className={styles.spinner} aria-hidden="true" size="var(--icon-size-xl)" />
        <p>{t("bootstrap.loading")}</p>
      </main>
    );
  }

  if (settingsQuery.isError || !settingsQuery.data) {
    return (
      <main className={styles.centered} role="alert">
        <AlertTriangle aria-hidden="true" size="var(--icon-size-xl)" />
        <h1>{t("bootstrap.errorTitle")}</h1>
        <p>{t("bootstrap.errorDescription")}</p>
        <button onClick={() => void settingsQuery.refetch()} type="button">
          {t("bootstrap.retry")}
        </button>
      </main>
    );
  }

  if (!settingsQuery.data.setupCompleted) {
    return <SetupWizard initialSettings={settingsQuery.data} />;
  }

  return <RouterProvider router={appRouter} />;
}
