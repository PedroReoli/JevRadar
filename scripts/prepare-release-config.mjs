import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { createReleaseConfig } from "./lib/release-config.mjs";

const outputArgument = process.argv[2];
if (!outputArgument) {
  console.error("Informe o caminho do arquivo de configuração gerado.");
  process.exit(1);
}

try {
  const outputPath = path.resolve(outputArgument);
  const config = createReleaseConfig(process.env);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(config, null, 2)}\n`, { flag: "wx" });
  console.log(`Configuração de release assinada criada em ${outputPath}.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
