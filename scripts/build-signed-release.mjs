import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { createReleaseConfig } from "./lib/release-config.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "jevradar-release-"));
const configPath = path.join(temporaryRoot, "tauri.release.conf.json");
const cargoBin = path.join(process.env.CARGO_HOME || path.join(process.env.USERPROFILE || process.env.HOME || "", ".cargo"), "bin");
const environment = {
  ...process.env,
  JEVRADAR_UPDATER_ENABLED: "1",
  PATH: `${cargoBin}${path.delimiter}${process.env.PATH || ""}`,
};

function run(program, args) {
  const result = spawnSync(program, args, { cwd: repositoryRoot, env: environment, shell: false, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

try {
  const config = createReleaseConfig(environment);
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, { flag: "wx" });
  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error("Execute a release assinada com npm run release:signed.");
  run(process.execPath, [npmCli, "run", "release:verify"]);
  run(process.execPath, [path.join(repositoryRoot, "node_modules", "@tauri-apps", "cli", "tauri.js"), "build", "--config", configPath]);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  const safePrefix = path.join(os.tmpdir(), "jevradar-release-");
  if (temporaryRoot.startsWith(safePrefix)) fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
