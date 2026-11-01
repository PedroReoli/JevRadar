import { useCallback, useEffect, useRef, useState } from "react";

import {
  checkForAppUpdate,
  closeAppUpdate,
  installAppUpdate,
  type AppUpdateHandle,
} from "@/services/updaterService";
import type { AppUpdateState } from "@/types/updater";

const initialState: AppUpdateState = { notes: null, phase: "idle", progress: null, version: null };

export function useAppUpdater() {
  const updateRef = useRef<AppUpdateHandle | null>(null);
  const [state, setState] = useState(initialState);

  const releaseCurrentUpdate = useCallback(async () => {
    const update = updateRef.current;
    updateRef.current = null;
    if (update) await closeAppUpdate(update).catch(() => undefined);
  }, []);

  useEffect(() => () => { void releaseCurrentUpdate(); }, [releaseCurrentUpdate]);

  const checkNow = useCallback(async () => {
    await releaseCurrentUpdate();
    setState({ ...initialState, phase: "checking" });
    try {
      const update = await checkForAppUpdate();
      if (!update) {
        setState({ ...initialState, phase: "current" });
        return;
      }
      updateRef.current = update;
      setState({ notes: update.body ?? null, phase: "available", progress: null, version: update.version });
    } catch {
      setState({ ...initialState, phase: "error" });
    }
  }, [releaseCurrentUpdate]);

  const install = useCallback(async () => {
    const update = updateRef.current;
    if (!update) return;
    setState((current) => ({ ...current, phase: "installing", progress: 0 }));
    try {
      await installAppUpdate(update, (progress) => setState((current) => ({ ...current, progress })));
    } catch {
      setState((current) => ({ ...current, phase: "error", progress: null }));
    }
  }, []);

  return { checkNow, install, state };
}
