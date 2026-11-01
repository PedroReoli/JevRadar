import { LogOut, Minus, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import styles from "@/components/desktop/CloseRequestDialog.module.css";
import { useCloseRequest } from "@/hooks/useCloseRequest";

export function CloseRequestDialog() {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { hasError, isOpen, isPending, resolve } = useCloseRequest();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      aria-labelledby="close-dialog-title"
      aria-describedby="close-dialog-description"
      className={styles.dialog}
      onCancel={(event) => {
        event.preventDefault();
        void resolve("cancel");
      }}
      ref={dialogRef}
    >
      <div className={styles.content}>
        <header>
          <div>
            <span>{t("desktop.closeEyebrow")}</span>
            <h2 id="close-dialog-title">{t("desktop.closeTitle")}</h2>
          </div>
          <button
            aria-label={t("desktop.cancel")}
            disabled={isPending}
            onClick={() => void resolve("cancel")}
            type="button"
          >
            <X aria-hidden="true" size="var(--icon-size-md)" />
          </button>
        </header>
        <p id="close-dialog-description">{t("desktop.closeDescription")}</p>
        {hasError && <p className={styles.error} role="alert">{t("desktop.closeError")}</p>}
        <div className={styles.actions}>
          <button className={styles.secondaryButton} disabled={isPending} onClick={() => void resolve("minimize")} type="button">
            <Minus aria-hidden="true" size="var(--icon-size-sm)" />
            {t("desktop.minimize")}
          </button>
          <button className={styles.dangerButton} disabled={isPending} onClick={() => void resolve("quit")} type="button">
            <LogOut aria-hidden="true" size="var(--icon-size-sm)" />
            {t("desktop.quit")}
          </button>
        </div>
        <small>{t("desktop.closePreferenceHint")}</small>
      </div>
    </dialog>
  );
}
