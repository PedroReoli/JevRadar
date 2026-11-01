import { describe, expect, it } from "vitest";

import {
  deleteSecret,
  getAppSettings,
  getSecretStatus,
  saveSecret,
  updateAppSettings,
} from "@/services/settingsService";

describe("settingsService no preview web", () => {
  it("preserva os padrões seguros e valida atualizações", async () => {
    const initial = await getAppSettings();

    expect(initial).toMatchObject({
      setupCompleted: false,
      launchOnStartupEnabled: false,
      localApiEnabled: false,
      telemetryEnabled: false,
      watchlistLimit: 50,
    });

    const updated = await updateAppSettings({
      ...initial,
      setupCompleted: true,
      experienceLevel: "intermediate",
      investmentRange: "upTo5k",
    });
    expect(updated.setupCompleted).toBe(true);

    await expect(
      updateAppSettings({ ...initial, watchlistLimit: 51 } as typeof initial),
    ).rejects.toThrow();
  });

  it("expõe somente a presença do segredo", async () => {
    await expect(saveSecret("typesafeApiKey", "   ")).rejects.toThrow("secret_empty");

    await saveSecret("typesafeApiKey", "not-a-real-key");
    expect((await getSecretStatus()).typesafeApiKey).toBe(true);

    await deleteSecret("typesafeApiKey");
    expect((await getSecretStatus()).typesafeApiKey).toBe(false);
  });
});
