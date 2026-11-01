import { BellRing, Send } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SelectField, ToggleField } from "@/features/settings/components/SettingsFields";
import { SettingsSection } from "@/features/settings/components/SettingsSection";
import styles from "@/features/settings/SettingsForm.module.css";
import { useTestNotification } from "@/features/settings/hooks/useTestNotification";
import { useContentOverview } from "@/features/sources/hooks/useContentSources";
import { useDefaultWatchlist } from "@/features/watchlist/hooks/useWatchlist";
import type { AppSettings } from "@/types/settings";

interface AlertSettingsSectionProps {
  disabled: boolean;
  settings: AppSettings;
  update: <Key extends keyof AppSettings>(key: Key, value: AppSettings[Key]) => void;
}

function toggleId(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}

export function AlertSettingsSection({ disabled, settings, update }: AlertSettingsSectionProps) {
  const { t } = useTranslation();
  const watchlist = useDefaultWatchlist();
  const sources = useContentOverview();
  const testNotification = useTestNotification();
  const contentSources = sources.data?.sources.filter((source) => ["rss", "reddit", "forum", "x"].includes(source.sourceKind)) ?? [];

  return (
    <SettingsSection
      description={t("settings.alertsDescription")}
      icon={<BellRing size="var(--icon-size-lg)" />}
      id="alert-settings-title"
      title={t("settings.alertsTitle")}
    >
      <ToggleField
        checked={settings.alertsEnabled}
        description={t("settings.alertsEnabledDescription")}
        disabled={disabled}
        label={t("settings.alertsEnabled")}
        onChange={(value) => update("alertsEnabled", value)}
      />
      <div className={styles.dataActions}>
        <div aria-live="polite">
          <strong>{t("settings.testNotificationTitle")}</strong>
          <small>{testNotification.isSuccess ? t("settings.testNotificationSent") : t("settings.testNotificationDescription")}</small>
          {testNotification.isError ? <small className={styles.fieldError}>{t("settings.testNotificationError")}</small> : null}
        </div>
        <button className={styles.secondaryButton} disabled={disabled || testNotification.isPending} onClick={() => testNotification.mutate()} type="button">
          <Send aria-hidden="true" size="var(--icon-size-sm)" />
          {testNotification.isPending ? t("settings.testingNotification") : t("settings.testNotification")}
        </button>
      </div>
      <SelectField
        description={t("settings.alertLevelDescription")}
        disabled={disabled || !settings.alertsEnabled}
        label={t("settings.alertLevel")}
        onChange={(value) => update("alertLevel", Number(value) as AppSettings["alertLevel"])}
        options={[
          ["1", t("settings.alertLevel1")],
          ["2", t("settings.alertLevel2")],
          ["3", t("settings.alertLevel3")],
          ["4", t("settings.alertLevel4")],
        ]}
        value={String(settings.alertLevel)}
      />
      <SelectField
        description={t("settings.alertWindowDescription")}
        disabled={disabled || !settings.alertsEnabled}
        label={t("settings.alertWindow")}
        onChange={(value) => update("alertWindowHours", Number(value))}
        options={[
          ["1", t("settings.alertWindow1")],
          ["6", t("settings.alertWindow6")],
          ["24", t("settings.alertWindow24")],
          ["168", t("settings.alertWindow168")],
          ["720", t("settings.alertWindow720")],
        ]}
        value={String(settings.alertWindowHours)}
      />
      <ToggleField
        checked={settings.alertQuietHoursEnabled}
        description={t("settings.quietHoursDescription")}
        disabled={disabled || !settings.alertsEnabled}
        label={t("settings.quietHours")}
        onChange={(value) => update("alertQuietHoursEnabled", value)}
      />
      {settings.alertQuietHoursEnabled ? (
        <div className={styles.timeRange}>
          <label><span>{t("settings.quietStart")}</span><input disabled={disabled} onChange={(event) => update("alertQuietStart", event.target.value)} type="time" value={settings.alertQuietStart} /></label>
          <label><span>{t("settings.quietEnd")}</span><input disabled={disabled} onChange={(event) => update("alertQuietEnd", event.target.value)} type="time" value={settings.alertQuietEnd} /></label>
        </div>
      ) : null}
      <fieldset className={styles.alertScope} disabled={disabled || !settings.alertsEnabled}>
        <legend>{t("settings.alertAssets")}</legend>
        <small>{t("settings.alertAssetsDescription")}</small>
        <div className={styles.filterGrid}>
          {watchlist.data?.assets.map(({ asset }) => (
            <label key={asset.id}><input checked={settings.alertAssetIds.includes(asset.id)} onChange={() => update("alertAssetIds", toggleId(settings.alertAssetIds, asset.id))} type="checkbox" /><span><strong>{asset.symbol}</strong>{asset.name}</span></label>
          ))}
        </div>
      </fieldset>
      <fieldset className={styles.alertScope} disabled={disabled || !settings.alertsEnabled}>
        <legend>{t("settings.alertSources")}</legend>
        <small>{t("settings.alertSourcesDescription")}</small>
        <div className={styles.filterGrid}>
          {contentSources.map((source) => (
            <label key={source.id}><input checked={settings.alertSourceIds.includes(source.id)} onChange={() => update("alertSourceIds", toggleId(settings.alertSourceIds, source.id))} type="checkbox" /><span><strong>{source.name}</strong>{t(`sources.kind.${source.sourceKind}`)}</span></label>
          ))}
        </div>
      </fieldset>
    </SettingsSection>
  );
}
