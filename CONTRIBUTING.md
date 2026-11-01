# Contribuindo com o JevRadar

Obrigado por contribuir. Antes de abrir uma mudança, leia a especificação em `.docs/specs/jev-radar-sdd.md` e as regras em `.rules/JEVRADAR-ENGINEERING.md`.

## Fluxo

1. Abra uma issue descrevendo comportamento, fonte de dados e impacto regulatório quando aplicável.
2. Crie uma branch pequena e focada.
3. Preserve a separação de camadas do frontend e do core Rust.
4. Adicione testes proporcionais ao risco e traduções PT-BR/inglês.
5. Execute:

```powershell
npm ci
npm run check
npm run build:web
cargo test --manifest-path src-tauri/Cargo.toml
cargo fmt --manifest-path src-tauri/Cargo.toml --check
```

6. Revise o diff para confirmar que nenhum segredo, banco, conteúdo coletado ou artefato entrou no commit.

## Commits

Use Conventional Commits em pt-BR, por exemplo:

- `feat(fontes): adiciona coletor RSS governado`
- `fix(backtest): impede uso de preço posterior`
- `docs(arquitetura): registra limite do adapter`

Um commit deve representar uma demanda lógica terminada. Não misture funcionalidades independentes e não fragmente artificialmente arquivos da mesma entrega.

## Fontes externas

Preferimos APIs oficiais. Scraping só é aceito com evidência de permissão nos termos e no `robots.txt`, sem contornar login, paywall, rate limit ou proteção técnica. Fixtures nunca podem ser apresentadas como dados reais.

## Linguagem financeira

Não use linguagem de compra, venda, entrada, posição recomendada ou retorno garantido. Hipóteses, correlações e causalidade não comprovada devem permanecer explicitamente distintas.
