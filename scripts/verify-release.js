import { spawnSync } from "node:child_process";
import fs from "node:fs";
import process from "node:process";

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const tauriConfig = JSON.parse(fs.readFileSync("src-tauri/tauri.conf.json", "utf8"));
const cargoManifest = fs.readFileSync("src-tauri/Cargo.toml", "utf8");
const cargoVersion = cargoManifest.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
const versions = new Set([packageJson.version, tauriConfig.version, cargoVersion]);

if (versions.size !== 1 || versions.has(undefined)) {
  console.error("As versões de package.json, tauri.conf.json e Cargo.toml precisam ser iguais.");
  process.exit(1);
}
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(packageJson.version)) {
  console.error("A versão não segue SemVer.");
  process.exit(1);
}
for (const required of ["LICENSE", "README.md", ".env.example", ".docs/specs/jev-radar-sdd.md"]) {
  if (!fs.existsSync(required)) {
    console.error(`Arquivo obrigatório ausente: ${required}`);
    process.exit(1);
  }
}
const diffCheck = spawnSync("git", ["diff", "--check"], { shell: false, stdio: "inherit" });
if (diffCheck.status !== 0) process.exit(diffCheck.status ?? 1);

console.log(`Release ${packageJson.version}: metadados e arquivos obrigatórios válidos.`);
