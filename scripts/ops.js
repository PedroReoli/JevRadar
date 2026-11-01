import { spawnSync } from "node:child_process";
import process from "node:process";
import readline from "node:readline/promises";

const colors = {
  cyan: "\u001b[36m",
  green: "\u001b[32m",
  yellow: "\u001b[33m",
  red: "\u001b[31m",
  bold: "\u001b[1m",
  dim: "\u001b[2m",
  reset: "\u001b[0m",
};

const commands = new Map([
  ["1", ["npm", ["run", "dev"], "Aplicação desktop"]],
  ["2", ["npm", ["run", "dev:web"], "Frontend isolado"]],
  ["3", ["npm", ["run", "check"], "Qualidade frontend"]],
  ["4", ["npm", ["run", "check:rust"], "Qualidade Rust"]],
  ["5", ["npm", ["run", "test:unit", "--", "--run"], "Testes unitários"]],
  ["6", ["npm", ["run", "build:web"], "Build frontend"]],
  ["7", ["npm", ["run", "build"], "Build desktop"]],
  ["8", ["npm", ["run", "check:all"], "Validação completa"]],
  ["9", ["npm", ["run", "release:verify"], "Verificação de release"]],
]);

function run(program, args, label) {
  console.log(`\n${colors.cyan}›${colors.reset} ${colors.bold}${label}${colors.reset}\n`);
  const startedAt = performance.now();
  const isNpm = program === "npm";
  const npmCli = process.env.npm_execpath;
  if (isNpm && !npmCli) {
    throw new Error("npm_execpath não está disponível. Execute este menu com npm run ops.");
  }
  const executable = isNpm ? process.execPath : program;
  const commandArgs = isNpm ? [npmCli, ...args] : args;
  const result = spawnSync(executable, commandArgs, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PATH: `${process.env.USERPROFILE}\\.cargo\\bin;${process.env.PATH ?? ""}`,
    },
    shell: false,
    stdio: "inherit",
  });
  const elapsed = ((performance.now() - startedAt) / 1000).toFixed(1);
  if (result.status !== 0) {
    if (result.error) {
      console.error(`${colors.red}${result.error.message}${colors.reset}`);
    }
    console.error(`\n${colors.red}Falhou${colors.reset} após ${elapsed}s.`);
    process.exit(result.status ?? 1);
  }
  console.log(`\n${colors.green}Concluído${colors.reset} em ${elapsed}s.`);
}

async function main() {
  const directChoice = process.argv[2];
  let choice = directChoice;
  if (!choice) {
    console.log(`\n${colors.bold}${colors.cyan}JevRadar Ops${colors.reset}`);
    console.log(`${colors.dim}Operações locais seguras e reproduzíveis${colors.reset}\n`);
    console.log("  [1] Aplicação desktop");
    console.log("  [2] Frontend isolado");
    console.log("  [3] Qualidade frontend");
    console.log("  [4] Qualidade Rust");
    console.log("  [5] Testes unitários");
    console.log("  [6] Build frontend");
    console.log("  [7] Build desktop");
    console.log("  [8] Validação completa");
    console.log("  [9] Verificação de release");
    console.log("  [0] Sair\n");
    const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
    choice = (await terminal.question(`${colors.cyan}Escolha [3]:${colors.reset} `)).trim() || "3";
    terminal.close();
  }
  if (choice === "0") return;
  const command = commands.get(choice);
  if (!command) {
    console.error(`${colors.yellow}Opção inválida.${colors.reset}`);
    process.exit(1);
  }
  run(command[0], command[1], command[2]);
}

await main();
