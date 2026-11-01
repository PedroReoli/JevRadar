import { Copy, KeyRound, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import styles from "@/features/settings/SettingsForm.module.css";
import { getLocalApiAccess, regenerateLocalApiToken } from "@/services/settingsService";
import type { LocalApiAccess } from "@/types/settings";

interface LocalApiAccessPanelProps { disabled: boolean }

export function LocalApiAccessPanel({ disabled }: LocalApiAccessPanelProps) {
  const { t } = useTranslation();
  const [access, setAccess] = useState<LocalApiAccess | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const reveal = async () => {
    setPending(true);
    setMessage(null);
    try {
      const result = await getLocalApiAccess();
      setAccess(result);
      if (!result) setMessage(t("settings.localApiSaveFirst"));
    } catch {
      setMessage(t("settings.localApiAccessError"));
    } finally {
      setPending(false);
    }
  };
  const regenerate = async () => {
    setPending(true);
    setMessage(null);
    try {
      setAccess(await regenerateLocalApiToken());
      setMessage(t("settings.localApiTokenRegenerated"));
    } catch {
      setMessage(t("settings.localApiAccessError"));
    } finally {
      setPending(false);
    }
  };
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(t("settings.localApiCopied"));
    } catch {
      setMessage(t("settings.localApiAccessError"));
    }
  };

  return (
    <div className={styles.apiAccessPanel}>
      <div>
        <strong>{t("settings.localApiAccessTitle")}</strong>
        <small>{t("settings.localApiAccessDescription")}</small>
      </div>
      {access ? (
        <div className={styles.apiCredentials}>
          <label><span>{t("settings.localApiBaseUrl")}</span><input readOnly value={access.baseUrl} /></label>
          <button aria-label={t("settings.copyBaseUrl")} className={styles.iconButton} onClick={() => void copy(access.baseUrl)} type="button"><Copy size="var(--icon-size-sm)" /></button>
          <label><span>{t("settings.localApiDocsUrl")}</span><input readOnly value={access.docsUrl} /></label>
          <button aria-label={t("settings.copyDocsUrl")} className={styles.iconButton} onClick={() => void copy(access.docsUrl)} type="button"><Copy size="var(--icon-size-sm)" /></button>
          <label><span>{t("settings.localApiToken")}</span><input readOnly type="password" value={access.token} /></label>
          <button aria-label={t("settings.copyToken")} className={styles.iconButton} onClick={() => void copy(access.token)} type="button"><Copy size="var(--icon-size-sm)" /></button>
        </div>
      ) : null}
      <div className={styles.apiActions}>
        <button className={styles.secondaryButton} disabled={disabled || pending} onClick={() => void reveal()} type="button"><KeyRound size="var(--icon-size-sm)" />{t("settings.revealLocalApi")}</button>
        <button className={styles.dangerButton} disabled={disabled || pending} onClick={() => void regenerate()} type="button"><RefreshCw size="var(--icon-size-sm)" />{t("settings.regenerateLocalApi")}</button>
      </div>
      {message ? <small aria-live="polite">{message}</small> : null}
    </div>
  );
}
