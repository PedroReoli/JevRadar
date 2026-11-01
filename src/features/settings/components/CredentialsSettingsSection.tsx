import { KeyRound } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SecretField } from "@/features/settings/components/SecretField";
import { SettingsSection } from "@/features/settings/components/SettingsSection";
import type { SecretStatus } from "@/types/settings";

interface CredentialsSettingsSectionProps {
  status: SecretStatus;
}

export function CredentialsSettingsSection({ status }: CredentialsSettingsSectionProps) {
  const { t } = useTranslation();

  return (
    <SettingsSection
      description={t("settings.credentialsDescription")}
      icon={<KeyRound size="var(--icon-size-lg)" />}
      id="credentials-settings-title"
      title={t("settings.credentialsTitle")}
    >
      <SecretField
        configured={status.typesafeApiKey}
        description={t("settings.typesafeDescription")}
        kind="typesafeApiKey"
        label={t("setup.jevKeyLabel")}
      />
      <SecretField
        configured={status.redditClientId}
        description={t("settings.redditClientIdDescription")}
        kind="redditClientId"
        label={t("settings.redditClientId")}
      />
      <SecretField
        configured={status.redditClientSecret}
        description={t("settings.redditClientSecretDescription")}
        kind="redditClientSecret"
        label={t("settings.redditClientSecret")}
      />
      <SecretField
        configured={status.xBearerToken}
        description={t("settings.xTokenDescription")}
        kind="xBearerToken"
        label={t("settings.xToken")}
      />
      <SecretField
        configured={status.brapiToken}
        description={t("settings.brapiTokenDescription")}
        kind="brapiToken"
        label={t("settings.brapiToken")}
      />
      <SecretField
        configured={status.alphaVantageApiKey}
        description={t("settings.alphaVantageDescription")}
        kind="alphaVantageApiKey"
        label={t("settings.alphaVantageApiKey")}
      />
    </SettingsSection>
  );
}
