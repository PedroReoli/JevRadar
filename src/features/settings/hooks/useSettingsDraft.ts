import { useMemo, useState } from "react";

import type { AppSettings } from "@/types/settings";

export function useSettingsDraft(settings: AppSettings) {
  const [baseline, setBaseline] = useState(settings);
  const [draft, setDraft] = useState(settings);

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(baseline),
    [baseline, draft],
  );

  const update = <Key extends keyof AppSettings>(key: Key, value: AppSettings[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const accept = (savedSettings: AppSettings) => {
    setBaseline(savedSettings);
    setDraft(savedSettings);
  };

  const reset = () => setDraft(baseline);

  return { accept, draft, isDirty, reset, update };
}
