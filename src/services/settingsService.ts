import { invoke, isTauri } from "@tauri-apps/api/core";
import { z } from "zod";

import type { AppSettings, SecretKind, SecretStatus } from "@/types/settings";

const settingsSchema = z.object({
  setupCompleted: z.boolean(),
  language: z.enum(["pt-BR", "en"]),
  backgroundCollectionEnabled: z.boolean(),
  launchOnStartupEnabled: z.boolean(),
  closeBehavior: z.enum(["ask", "minimize", "quit"]),
  localApiEnabled: z.boolean(),
  telemetryEnabled: z.boolean(),
  alertLevel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  watchlistLimit: z.number().int().min(1).max(50),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]),
  investmentRange: z.enum(["undisclosed", "upTo5k", "from5kTo20k", "from20kTo100k", "above100k"]),
});

const secretStatusSchema = z.object({
  typesafeApiKey: z.boolean(),
  redditClientId: z.boolean(),
  redditClientSecret: z.boolean(),
  xBearerToken: z.boolean(),
  brapiToken: z.boolean(),
});

let previewSettings: AppSettings = {
  setupCompleted: false,
  language: "pt-BR",
  backgroundCollectionEnabled: false,
  launchOnStartupEnabled: false,
  closeBehavior: "ask",
  localApiEnabled: false,
  telemetryEnabled: false,
  alertLevel: 2,
  watchlistLimit: 50,
  experienceLevel: "beginner",
  investmentRange: "undisclosed",
};

let previewSecretStatus: SecretStatus = {
  typesafeApiKey: false,
  redditClientId: false,
  redditClientSecret: false,
  xBearerToken: false,
  brapiToken: false,
};

export async function getAppSettings(): Promise<AppSettings> {
  if (!isTauri()) return previewSettings;
  const response: unknown = await invoke("get_app_settings");
  return settingsSchema.parse(response);
}

export async function updateAppSettings(settings: AppSettings): Promise<AppSettings> {
  const validated = settingsSchema.parse(settings);
  if (!isTauri()) {
    previewSettings = validated;
    return previewSettings;
  }
  const response: unknown = await invoke("update_app_settings", { settings: validated });
  return settingsSchema.parse(response);
}

export async function getSecretStatus(): Promise<SecretStatus> {
  if (!isTauri()) return previewSecretStatus;
  const response: unknown = await invoke("get_secret_status");
  return secretStatusSchema.parse(response);
}

export async function saveSecret(kind: SecretKind, value: string): Promise<void> {
  if (!value.trim()) throw new Error("secret_empty");
  if (!isTauri()) {
    previewSecretStatus = { ...previewSecretStatus, [kind]: true };
    return;
  }
  await invoke("save_secret", { kind, value });
}

export async function deleteSecret(kind: SecretKind): Promise<void> {
  if (!isTauri()) {
    previewSecretStatus = { ...previewSecretStatus, [kind]: false };
    return;
  }
  await invoke("delete_secret", { kind });
}
