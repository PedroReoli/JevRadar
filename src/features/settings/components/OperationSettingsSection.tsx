import { Activity } from "lucide-react";
import { useTranslation } from "react-i18next";

import { NumberField, SelectField, ToggleField } from "@/features/settings/components/SettingsFields";
import { LocalApiAccessPanel } from "@/features/settings/components/LocalApiAccessPanel";
import { SettingsSection } from "@/features/settings/components/SettingsSection";
import type { AppSettings } from "@/types/settings";

interface OperationSettingsSectionProps {
  disabled: boolean;
  settings: AppSettings;
  update: <Key extends keyof AppSettings>(key: Key, value: AppSettings[Key]) => void;
}

export function OperationSettingsSection({ disabled, settings, update }: OperationSettingsSectionProps) {
  const { t } = useTranslation();

  return (
    <SettingsSection
      description={t("settings.operationDescription")}
      icon={<Activity size="var(--icon-size-lg)" />}
      id="operation-settings-title"
      title={t("settings.operationTitle")}
    >
      <ToggleField
        checked={settings.backgroundCollectionEnabled}
        description={t("setup.backgroundDescription")}
        disabled={disabled}
        label={t("setup.backgroundLabel")}
        onChange={(value) => update("backgroundCollectionEnabled", value)}
      />
      <ToggleField
        checked={settings.launchOnStartupEnabled}
        description={t("setup.startupDescription")}
        disabled={disabled}
        label={t("setup.startupLabel")}
        onChange={(value) => update("launchOnStartupEnabled", value)}
      />
      <SelectField
        description={t("settings.closeBehaviorDescription")}
        disabled={disabled}
        label={t("settings.closeBehavior")}
        onChange={(value) => update("closeBehavior", value as AppSettings["closeBehavior"])}
        options={[
          ["ask", t("settings.closeAsk")],
          ["minimize", t("settings.closeMinimize")],
          ["quit", t("settings.closeQuit")],
        ]}
        value={settings.closeBehavior}
      />
      <ToggleField
        checked={settings.localApiEnabled}
        description={t("setup.localApiDescription")}
        disabled={disabled}
        label={t("setup.localApiLabel")}
        onChange={(value) => update("localApiEnabled", value)}
      />
      {settings.localApiEnabled ? <LocalApiAccessPanel disabled={disabled} /> : null}
      <ToggleField
        checked={settings.telemetryEnabled}
        description={t("settings.telemetryDescription")}
        disabled={disabled}
        label={t("setup.telemetryLabel")}
        onChange={(value) => update("telemetryEnabled", value)}
      />
      <NumberField
        description={t("settings.watchlistLimitDescription")}
        disabled={disabled}
        label={t("settings.watchlistLimit")}
        max={50}
        min={1}
        onChange={(value) => update("watchlistLimit", value)}
        value={settings.watchlistLimit}
      />
      <NumberField
        description={t("settings.jevBatchLimitDescription")}
        disabled={disabled}
        label={t("settings.jevBatchLimit")}
        max={100}
        min={1}
        onChange={(value) => update("jevBatchLimit", value)}
        value={settings.jevBatchLimit}
      />
      <NumberField
        description={t("settings.jevDailyLimitDescription")}
        disabled={disabled}
        label={t("settings.jevDailyLimit")}
        max={5000}
        min={1}
        onChange={(value) => update("jevDailyDocumentLimit", value)}
        value={settings.jevDailyDocumentLimit}
      />
    </SettingsSection>
  );
}
