import { UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SelectField } from "@/features/settings/components/SettingsFields";
import { SettingsSection } from "@/features/settings/components/SettingsSection";
import type { AppSettings } from "@/types/settings";

interface ProfileSettingsSectionProps {
  disabled: boolean;
  settings: AppSettings;
  update: <Key extends keyof AppSettings>(key: Key, value: AppSettings[Key]) => void;
}

export function ProfileSettingsSection({ disabled, settings, update }: ProfileSettingsSectionProps) {
  const { t } = useTranslation();

  return (
    <SettingsSection
      description={t("settings.profileDescription")}
      icon={<UserRound size="var(--icon-size-lg)" />}
      id="profile-settings-title"
      title={t("settings.profileTitle")}
    >
      <SelectField
        disabled={disabled}
        label={t("setup.experienceLabel")}
        onChange={(value) => update("experienceLevel", value as AppSettings["experienceLevel"])}
        options={[
          ["beginner", t("setup.experienceBeginner")],
          ["intermediate", t("setup.experienceIntermediate")],
          ["advanced", t("setup.experienceAdvanced")],
        ]}
        value={settings.experienceLevel}
      />
      <SelectField
        description={t("setup.investmentPrivacy")}
        disabled={disabled}
        label={t("setup.investmentLabel")}
        onChange={(value) => update("investmentRange", value as AppSettings["investmentRange"])}
        options={[
          ["undisclosed", t("setup.investmentUndisclosed")],
          ["upTo5k", t("setup.investmentUpTo5k")],
          ["from5kTo20k", t("setup.investment5kTo20k")],
          ["from20kTo100k", t("setup.investment20kTo100k")],
          ["above100k", t("setup.investmentAbove100k")],
        ]}
        value={settings.investmentRange}
      />
    </SettingsSection>
  );
}
