import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const executableName = process.platform === "win32" ? "cargo.exe" : "cargo";
const candidates = [
  process.env.CARGO_HOME ? path.join(process.env.CARGO_HOME, "bin", executableName) : null,
  process.env.USERPROFILE ? path.join(process.env.USERPROFILE, ".cargo", "bin", executableName) : null,
  process.env.HOME ? path.join(process.env.HOME, ".cargo", "bin", executableName) : null,
].filter(Boolean);
const cargo = candidates.find((candidate) => fs.existsSync(candidate)) ?? executableName;
const result = spawnSync(cargo, process.argv.slice(2), {
  cwd: process.cwd(),
  env: process.env,
  shell: false,
  stdio: "inherit",
});

if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
