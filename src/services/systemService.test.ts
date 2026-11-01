import { describe, expect, it } from "vitest";

import { getSystemStatus } from "@/services/systemService";

describe("systemService", () => {
  it("declara indisponibilidade real no preview do navegador", async () => {
    await expect(getSystemStatus()).resolves.toEqual({
      runtime: "browser-preview",
      version: "web-preview",
      database: "unavailable",
      backgroundCollection: "unavailable",
      localApi: "unavailable",
    });
  });
});
