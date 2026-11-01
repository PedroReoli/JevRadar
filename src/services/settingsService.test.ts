import { describe, expect, it } from "vitest";

import {
  deleteSecret,
  getAppSettings,
  getLocalApiAccess,
  getSecretStatus,
  saveSecret,
  regenerateLocalApiToken,
  updateAppSettings,
} from "@/services/settingsService";

describe("settingsService no preview web", () => {
  it("preserva os padrões seguros e valida atualizações", async () => {
    const initial = await getAppSettings();

    expect(initial).toMatchObject({
      setupCompleted: false,
      launchOnStartupEnabled: false,
      localApiEnabled: false,
      alertsEnabled: true,
      alertWindowHours: 24,
      alertQuietHoursEnabled: false,
      alertAssetIds: [],
      alertSourceIds: [],
      redditCommunities: expect.arrayContaining(["investimentos", "BogleheadsBrasil"]),
      watchlistLimit: 50,
      jevBatchLimit: 25,
      jevDailyDocumentLimit: 250,
    });
    expect(initial).not.toHaveProperty("telemetryEnabled");

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
    await expect(
      updateAppSettings({ ...initial, redditCommunities: ["investimentos", "Investimentos"] }),
    ).rejects.toThrow();
  });

  it("expõe somente a presença do segredo", async () => {
    await expect(saveSecret("typesafeApiKey", "   ")).rejects.toThrow("secret_empty");

    await saveSecret("typesafeApiKey", "not-a-real-key");
    expect((await getSecretStatus()).typesafeApiKey).toBe(true);

    await deleteSecret("typesafeApiKey");
    expect((await getSecretStatus()).typesafeApiKey).toBe(false);
  });

  it("só revela o acesso local sob ação explícita", async () => {
    expect(await getLocalApiAccess()).toBeNull();
    const access = await regenerateLocalApiToken();
    expect(access.baseUrl).toBe("http://127.0.0.1:47831");
    expect(access.token.length).toBeGreaterThanOrEqual(32);
  });
});
