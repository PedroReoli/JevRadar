import { BrainCircuit, Play } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useClassification } from "@/features/sources/hooks/useClassification";
import styles from "@/pages/sources/SourcesPage.module.css";

interface ClassificationPanelProps {
  pendingCount: number;
}

export function ClassificationPanel({ pendingCount }: ClassificationPanelProps) {
  const { t } = useTranslation();
  const mutation = useClassification();
  const result = mutation.data;

  return (
    <article className={styles.classificationPanel}>
      <span className={styles.classificationIcon} aria-hidden="true">
        <BrainCircuit size="var(--icon-size-lg)" strokeWidth={1.6} />
      </span>
      <div className={styles.classificationCopy}>
        <span>{t("sources.classificationEyebrow")}</span>
        <h2>{t("sources.classificationTitle")}</h2>
        <p>{t("sources.classificationDescription", { count: pendingCount })}</p>
        {result ? (
          <small role="status">
            {result.status === "skipped" && result.errorCode
              ? t(`sources.error.${result.errorCode}`, { defaultValue: result.errorCode })
              : t("sources.classificationResult", {
                analyzed: result.analyzedDocumentCount,
                classified: result.classifiedDocumentCount,
                uncertain: result.noAssetDocumentCount,
                failed: result.failedDocumentCount,
              })}
          </small>
        ) : null}
        {mutation.isError ? <small className={styles.inlineError} role="alert">{t("sources.classificationError")}</small> : null}
      </div>
      <button
        className={styles.classifyAction}
        disabled={mutation.isPending || pendingCount === 0}
        onClick={() => mutation.mutate()}
        type="button"
      >
        <Play aria-hidden="true" size="var(--icon-size-sm)" />
        {mutation.isPending ? t("sources.classifying") : t("sources.classify")}
      </button>
    </article>
  );
}
