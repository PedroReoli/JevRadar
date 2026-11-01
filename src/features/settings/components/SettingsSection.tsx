import type { ReactNode } from "react";

import styles from "@/features/settings/SettingsForm.module.css";

interface SettingsSectionProps {
  children: ReactNode;
  description: string;
  icon: ReactNode;
  id: string;
  title: string;
}

export function SettingsSection({ children, description, icon, id, title }: SettingsSectionProps) {
  return (
    <section aria-labelledby={id} className={styles.section}>
      <header className={styles.sectionHeader}>
        <span className={styles.sectionIcon} aria-hidden="true">{icon}</span>
        <div>
          <h2 id={id}>{title}</h2>
          <p>{description}</p>
        </div>
      </header>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}
