import { AlertTriangle, Inbox, LoaderCircle, RefreshCw } from "lucide-react";

import styles from "@/components/product/PageState.module.css";

interface PageStateProps {
  actionLabel?: string;
  kind: "loading" | "error" | "empty";
  message: string;
  onAction?: () => void;
}

const icons = { loading: LoaderCircle, error: AlertTriangle, empty: Inbox } as const;

export function PageState({ actionLabel, kind, message, onAction }: PageStateProps) {
  const Icon = icons[kind];
  return (
    <div className={`${styles.state} ${kind === "error" ? styles.error : ""}`} role={kind === "error" ? "alert" : "status"}>
      <Icon aria-hidden="true" size="var(--icon-size-xl)" />
      <p>{message}</p>
      {onAction && actionLabel ? (
        <button onClick={onAction} type="button">
          <RefreshCw aria-hidden="true" size="var(--icon-size-sm)" /> {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
