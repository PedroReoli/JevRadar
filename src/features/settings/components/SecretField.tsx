import { CheckCircle2, Eye, EyeOff, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import styles from "@/features/settings/SettingsForm.module.css";
import { useDeleteSecret, useSaveSecret } from "@/hooks/useAppSettings";
import type { SecretKind } from "@/types/settings";

interface SecretFieldProps {
  configured: boolean;
  description: string;
  kind: SecretKind;
  label: string;
}

export function SecretField({ configured, description, kind, label }: SecretFieldProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const [visible, setVisible] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState(false);
  const saveMutation = useSaveSecret();
  const deleteMutation = useDeleteSecret();
  const isPending = saveMutation.isPending || deleteMutation.isPending;

  const save = async () => {
    setError(false);
    try {
      await saveMutation.mutateAsync({ kind, value });
      setValue("");
    } catch {
      setError(true);
    }
  };

  const remove = async () => {
    setError(false);
    try {
      await deleteMutation.mutateAsync(kind);
      setConfirmDelete(false);
    } catch {
      setError(true);
    }
  };

  return (
    <form
      className={styles.secretField}
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <div className={styles.secretHeader}>
        <span>
          <strong>{label}</strong>
          <small>{description}</small>
        </span>
        <span className={configured ? styles.configured : styles.notConfigured}>
          {configured && <CheckCircle2 aria-hidden="true" size="var(--icon-size-sm)" />}
          {configured ? t("settings.credentialConfigured") : t("settings.credentialMissing")}
        </span>
      </div>
      <div className={styles.secretControls}>
        <label>
          <input
            aria-label={label}
            autoComplete="off"
            disabled={isPending}
            onChange={(event) => setValue(event.target.value)}
            placeholder={configured ? t("settings.credentialReplacePlaceholder") : t("settings.credentialPlaceholder")}
            type={visible ? "text" : "password"}
            value={value}
          />
        </label>
        <button
          aria-label={visible ? t("settings.hideCredential") : t("settings.showCredential")}
          className={styles.iconButton}
          disabled={isPending}
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          {visible ? <EyeOff aria-hidden="true" size="var(--icon-size-md)" /> : <Eye aria-hidden="true" size="var(--icon-size-md)" />}
        </button>
        <button
          className={styles.secondaryButton}
          disabled={isPending || !value.trim()}
          type="submit"
        >
          {saveMutation.isPending ? t("settings.saving") : t("settings.saveCredential")}
        </button>
        {configured && !confirmDelete && (
          <button
            aria-label={t("settings.removeCredential", { label })}
            className={styles.dangerIconButton}
            disabled={isPending}
            onClick={() => setConfirmDelete(true)}
            type="button"
          >
            <Trash2 aria-hidden="true" size="var(--icon-size-md)" />
          </button>
        )}
      </div>
      {confirmDelete && (
        <div className={styles.confirmation} role="group" aria-label={t("settings.removeCredential", { label })}>
          <span>{t("settings.confirmCredentialRemoval")}</span>
          <button className={styles.dangerButton} disabled={isPending} onClick={() => void remove()} type="button">
            {t("settings.confirmRemove")}
          </button>
          <button className={styles.ghostButton} disabled={isPending} onClick={() => setConfirmDelete(false)} type="button">
            {t("settings.cancel")}
          </button>
        </div>
      )}
      {error && <p className={styles.fieldError} role="alert">{t("settings.credentialError")}</p>}
    </form>
  );
}
