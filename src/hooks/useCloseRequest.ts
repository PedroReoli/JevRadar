import { isTauri } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";

import { resolveCloseRequest } from "@/services/desktopService";
import type { CloseResolution } from "@/types/desktop";

const closeRequestedEvent = "jevradar://close-requested";

export function useCloseRequest() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!isTauri()) return;

    let disposed = false;
    let unlisten: UnlistenFn | undefined;
    void listen(closeRequestedEvent, () => {
      setHasError(false);
      setIsOpen(true);
    }).then((listener) => {
      if (disposed) listener();
      else unlisten = listener;
    });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  const resolve = async (resolution: CloseResolution) => {
    setHasError(false);
    setIsPending(true);
    try {
      await resolveCloseRequest(resolution);
      setIsOpen(false);
    } catch {
      setHasError(true);
    } finally {
      setIsPending(false);
    }
  };

  return { hasError, isOpen, isPending, resolve };
}
