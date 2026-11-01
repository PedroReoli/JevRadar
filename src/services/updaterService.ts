import { check, type DownloadEvent, type Update } from "@tauri-apps/plugin-updater";

export type AppUpdateHandle = Update;

export function checkForAppUpdate(): Promise<Update | null> {
  return check({ timeout: 15_000 });
}

export async function installAppUpdate(update: Update, onProgress: (progress: number | null) => void) {
  let downloaded = 0;
  let total: number | null = null;
  const trackProgress = (event: DownloadEvent) => {
    if (event.event === "Started") total = event.data.contentLength ?? null;
    if (event.event === "Progress") downloaded += event.data.chunkLength;
    if (event.event === "Finished") onProgress(100);
    else onProgress(total && total > 0 ? Math.min(100, Math.round((downloaded / total) * 100)) : null);
  };
  await update.downloadAndInstall(trackProgress, { timeout: 120_000 });
}

export function closeAppUpdate(update: Update): Promise<void> {
  return update.close();
}
