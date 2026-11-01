import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SelectField } from "@/features/settings/components/SettingsFields";
import { SettingsSection } from "@/features/settings/components/SettingsSection";
import type { AppSettings } from "@/types/settings";

interface InterfaceSettingsSectionProps {
  disabled: boolean;
  settings: AppSettings;
  update: <Key extends keyof AppSettings>(key: Key, value: AppSettings[Key]) => void;
}

export function InterfaceSettingsSection({ disabled, settings, update }: InterfaceSettingsSectionProps) {
  const { t } = useTranslation();

  return (
    <SettingsSection
      description={t("settings.interfaceDescription")}
      icon={<Languages size="var(--icon-size-lg)" />}
      id="interface-settings-title"
      title={t("settings.interfaceTitle")}
    >
      <SelectField
        disabled={disabled}
        label={t("settings.language")}
        onChange={(value) => update("language", value as AppSettings["language"])}
        options={[["pt-BR", t("settings.portuguese")], ["en", t("settings.english")]]}
        value={settings.language}
      />
    </SettingsSection>
  );
}
