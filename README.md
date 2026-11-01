# JevRadar

Radar desktop local-first de sentimento, contexto e sinais de mercado. O JevRadar cruza conteúdo público, classificações tipadas do Jev e séries reais de mercado para mostrar mudanças de atenção e medir o que ocorreu historicamente depois de sinais semelhantes.

> O JevRadar não recomenda compra ou venda, não define tamanho de posição, não executa ordens e não substitui análise profissional.

## Estado do projeto

O repositório está em **alpha para Windows**. O núcleo público funciona sem qualquer motor preditivo privado e inclui:

- wizard inicial bilíngue, preferências locais e credenciais no Windows Credential Manager;
- watchlist de até 50 ativos;
- preços de Binance e brapi, indicadores do Banco Central e conteúdo via RSS, Reddit oficial (posts e comentários de comunidades BR/globais) e X opcional BYOK;
- feeds RSS personalizados para fóruns, blogs e publicações que exponham um feed público;
- lista configurável de até 25 comunidades do Reddit, com coleta oficial de posts e comentários;
- classificação Jev por ativo, sentimento, relevância, tipo, alegação factual, hype e contexto externo;
- agregação auditável, alertas locais em quatro níveis e coleta em background configurável;
- teste explícito de notificação nas configurações, sem criar sinal ou alterar o histórico;
- dashboard com filtros na URL, mapa de calor, preço × sentimento, eventos, contexto educacional e lacunas de cobertura;
- backtest cronológico em 1, 7 e 30 dias, com baseline, intervalo de confiança e separação calibração/avaliação;
- API local opcional, autenticada e somente leitura, com Swagger e evidências auditáveis em `http://127.0.0.1:47831/docs/`;
- atualização confirmada pelo usuário em builds assinados, com verificação criptográfica do artefato;
- exportação do SQLite e exclusão confirmada do histórico local.

Scraping de fóruns e mercados internacionais são adapters futuros, não funcionalidades simuladas. Novos scrapers exigem revisão individual de termos e `robots.txt`. Fontes pagas são sempre opcionais e usam credenciais do próprio usuário.

## Arquitetura

```mermaid
flowchart LR
  UI[React + TypeScript] --> CMD[Comandos Tauri]
  CMD --> APP[Casos de uso Rust]
  APP --> DB[(SQLite local)]
  APP --> KEY[Credential Manager]
  APP --> JEV[Jev / System One]
  APP --> DATA[Binance · brapi · BCB]
  APP --> CONTENT[RSS · Reddit · X opcional]
  APP --> API[API loopback + Swagger]
  APP --> BG[Worker em background]
  DB --> SIGNAL[Agregação auditável]
  SIGNAL --> UI
  SIGNAL --> BACKTEST[Backtest cronológico]
  BACKTEST --> UI
```

O frontend separa `types`, `services`, `hooks`, `components` e `pages`. O core separa domínio, aplicação, infraestrutura e interface. Tokens visuais ficam em `src/styles/tokens.css`; nenhuma credencial é gravada no frontend ou no SQLite.

Decisões e especificação:

- [SDD](.docs/specs/jev-radar-sdd.md)
- [ADR 0001 — open core local](.docs/adr/0001-open-core-local.md)
- [regras de engenharia](.rules/JEVRADAR-ENGINEERING.md)

## Requisitos

- Windows 10/11;
- Node.js 22 ou superior;
- Rust stable com toolchain MSVC;
- WebView2;
- chave TypeSafe/Jev para classificação. As fontes gratuitas continuam utilizáveis sem ela.

## Desenvolvimento

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

O `.env` serve apenas ao desenvolvimento e é ignorado pelo Git. As credenciais usadas pelo aplicativo devem ser cadastradas no wizard ou em Configurações.

Comandos principais:

```powershell
npm run ops
npm run check
npm run check:rust
npm run build:web
npm run build
npm run test:e2e:desktop
npm run release:smoke
npm run release:signed
```

`npm run ops` oferece um menu para desenvolvimento, testes, E2E e builds. O E2E usa o
executável compilado e o WebView2 real; rode `npm run build` antes dele. O build desktop
gera o instalador NSIS para Windows.

`release:signed` é o caminho de publicação: exige certificado Authenticode, chave do
updater, endpoint HTTPS e servidor de timestamp. A ausência de qualquer pré-requisito
interrompe o processo antes de publicar um artefato que pareça assinado.

## Segurança e dados

- API local desligada por padrão, limitada a `127.0.0.1` e protegida por bearer token;
- nenhuma telemetria externa é enviada nesta release;
- segredos armazenados pelo keychain do sistema;
- teto diário e por lote para consumo do Jev;
- conteúdo social bruto é anonimizado ao vencer a retenção, sem destruir a trilha agregada de auditoria;
- exportação cria uma cópia consistente na pasta Downloads;
- exclusão de histórico preserva preferências, catálogo e credenciais.

Falhas de segurança devem seguir [SECURITY.md](SECURITY.md).

## Open core

Este repositório Apache-2.0 contém o aplicativo completo descritivo, integrações e contratos públicos. Um eventual motor preditivo avançado terá repositório e licença próprios; sua ausência não desabilita os recursos públicos descritos acima.

## Contribuição

Leia [CONTRIBUTING.md](CONTRIBUTING.md). Commits seguem Conventional Commits em pt-BR e representam entregas lógicas completas — sem misturar demandas independentes.

## Licença

Apache License 2.0. Consulte [LICENSE](LICENSE).
