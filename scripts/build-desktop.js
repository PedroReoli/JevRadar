import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cargoBin = path.join(
  process.env.CARGO_HOME || path.join(process.env.USERPROFILE || process.env.HOME || "", ".cargo"),
  "bin",
);
const environment = {
  ...process.env,
  PATH: `${cargoBin}${path.delimiter}${process.env.PATH || ""}`,
};

function runNode(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: repositoryRoot,
    env: environment,
    shell: false,
    stdio: "inherit",
  });
  if (result.error) {
    console.error(result.error.message);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const npmCli = process.env.npm_execpath;
if (!npmCli) {
  console.error("Execute o build com npm run build.");
  process.exit(1);
}

runNode(npmCli, ["run", "check"]);
runNode(path.join(repositoryRoot, "node_modules", "@tauri-apps", "cli", "tauri.js"), ["build"]);
