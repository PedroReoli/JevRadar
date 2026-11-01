import { describe, expect, it } from "vitest";

import { createReleaseConfig, validateReleaseEnvironment } from "./lib/release-config.mjs";

const validEnvironment = {
  JEVRADAR_UPDATER_PUBLIC_KEY: "PUBLIC KEY",
  JEVRADAR_UPDATER_ENDPOINT: "https://example.com/latest.json",
  TAURI_SIGNING_PRIVATE_KEY: "private key path",
  TAURI_SIGNING_PRIVATE_KEY_PASSWORD: "password",
  WINDOWS_CERTIFICATE_THUMBPRINT: "A".repeat(40),
  JEVRADAR_TIMESTAMP_URL: "https://timestamp.example.com",
};

describe("configuração de release assinada", () => {
  it("falha explicitamente quando uma credencial obrigatória está ausente", () => {
    expect(() => validateReleaseEnvironment({})).toThrow("JEVRADAR_UPDATER_PUBLIC_KEY");
  });

  it("recusa endpoints inseguros", () => {
    expect(() => validateReleaseEnvironment({ ...validEnvironment, JEVRADAR_UPDATER_ENDPOINT: "http://example.com/latest.json" })).toThrow("HTTPS");
  });

  it("gera somente a configuração pública necessária ao bundle", () => {
    const config = createReleaseConfig(validEnvironment);
    expect(config.bundle.createUpdaterArtifacts).toBe(true);
    expect(config.plugins.updater.endpoints).toEqual(["https://example.com/latest.json"]);
    expect(JSON.stringify(config)).not.toContain(validEnvironment.TAURI_SIGNING_PRIVATE_KEY);
    expect(JSON.stringify(config)).not.toContain(validEnvironment.TAURI_SIGNING_PRIVATE_KEY_PASSWORD);
  });
});
