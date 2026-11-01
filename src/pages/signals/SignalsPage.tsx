import { RadioTower } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PageState } from "@/components/product/PageState";
import { SignalExplorerList } from "@/features/signals/components/SignalExplorerList";
import { SignalFilters } from "@/features/signals/components/SignalFilters";
import { SignalSummary } from "@/features/signals/components/SignalSummary";
import { useSignalExplorer } from "@/features/signals/hooks/useSignalExplorer";
import styles from "@/styles/ProductPage.module.css";

export function SignalsPage() {
  const { t } = useTranslation();
  const { signalsQuery, state, updateFilter } = useSignalExplorer();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>{t("product.signals.eyebrow")}</span>
          <h1>{t("product.signals.title")}</h1>
          <p>{t("product.signals.description")}</p>
        </div>
        <RadioTower aria-hidden="true" size="var(--icon-size-xl)" />
      </header>

      <SignalFilters onChange={updateFilter} state={state} />
      <SignalSummary summary={state.summary} />

      {signalsQuery.isPending ? <PageState kind="loading" message={t("product.loading")} /> : null}
      {signalsQuery.isError ? (
        <PageState
          actionLabel={t("product.retry")}
          kind="error"
          message={t("product.loadError")}
          onAction={() => void signalsQuery.refetch()}
        />
      ) : null}
      {!signalsQuery.isPending && !signalsQuery.isError && state.filteredSignals.length === 0 ? (
        <PageState kind="empty" message={t("product.signals.empty")} />
      ) : null}
      {state.filteredSignals.length > 0 ? <SignalExplorerList signals={state.filteredSignals} /> : null}

      <footer className={styles.disclosure}>{t("product.disclosure")}</footer>
    </main>
  );
}
