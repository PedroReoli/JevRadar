import { MessageCircleMore } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { SettingsSection } from "@/features/settings/components/SettingsSection";
import styles from "@/features/settings/SettingsForm.module.css";
import type { AppSettings } from "@/types/settings";

interface SourceSettingsSectionProps {
  disabled: boolean;
  settings: AppSettings;
  update: <Key extends keyof AppSettings>(key: Key, value: AppSettings[Key]) => void;
}

function parseCommunities(value: string) {
  return value
    .split(/[\n,]/)
    .map((community) => community.trim().replace(/^\/?r\//i, ""))
    .filter(Boolean);
}

function validCommunities(communities: string[]) {
  const unique = new Set(communities.map((community) => community.toLowerCase()));
  return communities.length >= 1
    && communities.length <= 25
    && unique.size === communities.length
    && communities.every((community) => /^[A-Za-z0-9_]{2,21}$/.test(community));
}

export function SourceSettingsSection({ disabled, settings, update }: SourceSettingsSectionProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState(() => settings.redditCommunities.join(", "));
  const lastEmitted = useRef(settings.redditCommunities.join(", "));
  useEffect(() => {
    const incoming = settings.redditCommunities.join(", ");
    if (incoming !== lastEmitted.current) {
      lastEmitted.current = incoming;
      setValue(incoming);
    }
  }, [settings.redditCommunities]);
  const communities = useMemo(() => parseCommunities(value), [value]);
  const valid = validCommunities(communities);

  const change = (nextValue: string) => {
    setValue(nextValue);
    const nextCommunities = parseCommunities(nextValue);
    lastEmitted.current = nextCommunities.join(", ");
    update("redditCommunities", nextCommunities);
  };

  return (
    <SettingsSection
      description={t("settings.sourcesDescription")}
      icon={<MessageCircleMore size="var(--icon-size-lg)" />}
      id="source-settings-title"
      title={t("settings.sourcesTitle")}
    >
      <label className={styles.communityField}>
        <span>
          <strong>{t("settings.redditCommunities")}</strong>
          <small>{t("settings.redditCommunitiesDescription")}</small>
        </span>
        <textarea
          aria-invalid={!valid}
          disabled={disabled}
          onChange={(event) => change(event.target.value)}
          rows={3}
          value={value}
        />
        <small className={valid ? undefined : styles.fieldError}>
          {valid
            ? t("settings.redditCommunitiesCount", { count: communities.length })
            : t("settings.redditCommunitiesInvalid")}
        </small>
      </label>
    </SettingsSection>
  );
}
