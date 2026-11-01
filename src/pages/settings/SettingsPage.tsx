import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

import styles from "@/pages/settings/SettingsPage.module.css";

type SupportedLanguage = "pt-BR" | "en";

export function SettingsPage() {
  const { i18n, t } = useTranslation();

  const changeLanguage = (language: SupportedLanguage) => {
    window.localStorage.setItem("jevradar.language", language);
    void i18n.changeLanguage(language);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span>{t("settings.eyebrow")}</span>
        <h1>{t("settings.title")}</h1>
        <p>{t("settings.description")}</p>
      </header>

      <section className={styles.card} aria-labelledby="language-title">
        <div className={styles.cardIcon}>
          <Languages aria-hidden="true" size="var(--icon-size-lg)" />
        </div>
        <div className={styles.cardContent}>
          <h2 id="language-title">{t("settings.language")}</h2>
          <p>{t("settings.languageDescription")}</p>
          <div className={styles.segmentedControl} role="group" aria-label={t("settings.language")}>
            <button
              aria-pressed={i18n.language === "pt-BR"}
              onClick={() => changeLanguage("pt-BR")}
              type="button"
            >
              {t("settings.portuguese")}
            </button>
            <button aria-pressed={i18n.language === "en"} onClick={() => changeLanguage("en")} type="button">
              {t("settings.english")}
            </button>
          </div>
        </div>
      </section>

      <p className={styles.pending}>{t("settings.setupPending")}</p>
    </div>
  );
}
