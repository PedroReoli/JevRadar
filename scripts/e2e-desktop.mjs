import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { chromium } from "playwright-core";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const executablePath = path.join(repositoryRoot, "src-tauri", "target", "release", "jevradar.exe");
const artifactDirectory = path.join(repositoryRoot, "output", "playwright", "desktop-smoke");
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "jevradar-e2e-"));
let applicationProcess;
let browser;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function availablePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close(() => port ? resolve(port) : reject(new Error("Porta CDP indisponível.")));
    });
  });
}

async function waitForCdp(port) {
  const endpoint = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${endpoint}/json/version`);
      if (response.ok) return endpoint;
    } catch {
      // O WebView2 ainda está iniciando.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("O endpoint CDP do WebView2 não ficou disponível em 10 segundos.");
}

async function waitForApplicationPage(browserInstance) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    for (const context of browserInstance.contexts()) {
      const page = context.pages().find((candidate) => candidate.url().startsWith("http://tauri.localhost"));
      if (page) return page;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("A página principal do JevRadar não foi encontrada no WebView2 em 20 segundos.");
}

async function completeWizardIfNeeded(page) {
  const welcome = page.getByRole("heading", { name: "Bem-vindo ao JevRadar" });
  if (!(await welcome.isVisible().catch(() => false))) return;

  for (let step = 0; step < 4; step += 1) {
    await page.getByRole("button", { name: "Continuar" }).click();
  }
  await page.getByRole("button", { name: "Concluir configuração" }).click();
  await page.getByRole("heading", { name: "Radar de mercado" }).waitFor();
}

async function visitNavigationRoute(page, linkName, heading) {
  await page.getByRole("link", { name: linkName, exact: true }).click();
  await page.getByRole("heading", { name: heading, exact: true }).waitFor();
  return new URL(page.url()).pathname;
}

async function validateApplication(page) {
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.waitForLoadState("domcontentloaded");
  await completeWizardIfNeeded(page);
  await page.getByRole("heading", { name: "Radar de mercado" }).waitFor();

  const routes = [
    ["Sinais", "Central de sinais", "/signals"],
    ["Evidências", "Feed de evidências", "/feed"],
    ["Cobertura", "Movimentos com pouca cobertura", "/coverage-gaps"],
    ["Alertas", "Central de alertas", "/alerts"],
    ["Eventos", "Eventos e relações", "/events"],
    ["Backtest", "Qualidade dos sinais", "/backtest"],
    ["Ativos", "Ativos e watchlist", "/watchlist"],
    ["Fontes", "Fontes e documentos", "/sources"],
    ["Operação", "Operação e coletas", "/operations"],
    ["Relatórios", "Relatórios", "/reports"],
    ["Configurações", "Configurações", "/settings"],
  ];
  for (const [linkName, heading, expectedPath] of routes) {
    const pathName = await visitNavigationRoute(page, linkName, heading);
    assert(pathName === expectedPath, `Rota ${linkName} abriu ${pathName}, esperado ${expectedPath}.`);
  }

  await page.getByRole("heading", { name: "Comunidades monitoradas" }).waitFor();
  await page.getByRole("button", { name: "Enviar teste" }).click();
  await page.getByText("O teste foi enviado ao Windows.").waitFor();
  const communitiesField = page.getByLabel("Comunidades do Reddit");
  const currentCommunities = await communitiesField.inputValue();
  const expectedCommunities = currentCommunities.includes("SecurityAnalysis")
    ? ["investimentos", "BogleheadsBrasil"]
    : ["investimentos", "BogleheadsBrasil", "SecurityAnalysis"];
  await communitiesField.fill(expectedCommunities.join(", "));
  await page.getByText(`${expectedCommunities.length} comunidades serão consultadas em posts e comentários recentes.`).waitFor();
  await page.getByRole("button", { name: "Salvar preferências" }).click();
  await page.getByText("Preferências salvas nesta máquina.").waitFor();
  await page.reload();
  await page.getByRole("heading", { name: "Configurações", exact: true }).waitFor();
  assert((await page.getByLabel("Comunidades do Reddit").inputValue()).includes(expectedCommunities.at(-1)), "As comunidades do Reddit não foram persistidas.");

  await page.getByRole("heading", { name: "Atualizações do aplicativo" }).waitFor();
  await page.getByRole("button", { name: "Verificar atualização" }).click();
  await page.getByText("Não foi possível consultar o canal de atualização").waitFor();

  await page.getByLabel("Idioma").selectOption("en");
  await page.getByRole("button", { name: "Salvar preferências" }).click();
  await page.getByRole("heading", { name: "Settings", exact: true }).waitFor();
  await page.getByLabel("Language").selectOption("pt-BR");
  await page.getByRole("button", { name: "Save preferences" }).click();
  await page.getByRole("heading", { name: "Configurações", exact: true }).waitFor();

  await page.goto("http://tauri.localhost/getting-started");
  await page.getByRole("heading", { name: "Prepare seu primeiro sinal" }).waitFor();

  await page.goto("http://tauri.localhost/assets/asset%3Ab3%3APETR4");
  await page.getByRole("heading", { name: "Detalhes de PETR4" }).waitFor();

  await page.goto("http://tauri.localhost/sources/source%3Areddit");
  await page.getByRole("heading", { name: "Reddit", exact: true }).waitFor();

  await page.goto("http://tauri.localhost/signals/signal%3Ainexistente");
  await page.getByText("O sinal solicitado não existe mais no histórico local.").waitFor();

  await page.goto("http://tauri.localhost/watchlist");
  const catalog = page.getByRole("region", { name: "Catálogo de ativos" });
  const visibleItems = await catalog.getByRole("listitem").count();
  assert(visibleItems <= 50, `O catálogo renderizou ${visibleItems} itens; o limite é 50.`);

  await page.setViewportSize({ width: 960, height: 640 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), "Há overflow horizontal em 960 × 640.");
  fs.mkdirSync(artifactDirectory, { recursive: true });
  await page.screenshot({ path: path.join(artifactDirectory, "watchlist-960x640.png"), fullPage: true });

  assert(consoleErrors.length === 0, `Erros no console: ${consoleErrors.join(" | ")}`);
  return { routes: routes.length + 5, catalogItems: visibleItems, viewport: "960x640" };
}

async function cleanup() {
  if (browser) await browser.close().catch(() => undefined);
  if (applicationProcess && !applicationProcess.killed) applicationProcess.kill();
  const safePrefix = path.join(os.tmpdir(), "jevradar-e2e-");
  if (temporaryRoot.startsWith(safePrefix)) fs.rmSync(temporaryRoot, { recursive: true, force: true });
}

try {
  assert(process.platform === "win32", "O E2E desktop desta release exige Windows.");
  assert(fs.existsSync(executablePath), "Executável ausente. Rode npm run build antes do E2E.");
  const port = await availablePort();
  applicationProcess = spawn(executablePath, [], {
    cwd: repositoryRoot,
    detached: false,
    env: {
      ...process.env,
      APPDATA: temporaryRoot,
      LOCALAPPDATA: temporaryRoot,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port}`,
    },
    stdio: "ignore",
    windowsHide: true,
  });
  const applicationError = new Promise((_, reject) => applicationProcess.once("error", reject));
  const cdpEndpoint = await Promise.race([waitForCdp(port), applicationError]);
  browser = await chromium.connectOverCDP(cdpEndpoint);
  const page = await Promise.race([waitForApplicationPage(browser), applicationError]);
  const result = await validateApplication(page);
  console.log(`E2E desktop aprovado: ${result.routes} rotas, ${result.catalogItems} itens no catálogo, viewport ${result.viewport}.`);
} finally {
  await cleanup();
}
