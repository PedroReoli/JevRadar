# Release Windows

## O que já está automatizado

- Validação de TypeScript, ESLint, Vitest, Rust, formatação e build web.
- Conferência de versão entre `package.json`, `Cargo.toml` e `tauri.conf.json`.
- Build NSIS por usuário, com instalador em português e inglês.
- Smoke test Playwright no WebView2 real do executável compilado, com perfil temporário isolado.
- Geração de artefato de updater assinado e `latest.json` para o NSIS.
- Assinatura Authenticode e criação de release rascunho no GitHub para tags `v*`.
- Falha explícita antes da publicação quando certificado, chave, endpoint ou timestamp estiverem ausentes.

## O que exige credenciais externas

O workflow produz um instalador funcional, mas não afirma identidade editorial no Windows enquanto não houver certificado de assinatura de código. A assinatura Authenticode requer certificado ou provedor de assinatura escolhido pelo mantenedor.

A atualização automática permanece desabilitada nos builds locais comuns. A pipeline assinada está preparada e será habilitada quando existirem:

1. repositório remoto definitivo e URL pública de releases;
2. par de chaves do updater Tauri, com a chave privada fora do Git;
3. chave pública registrada na configuração do aplicativo;
4. URL HTTPS do servidor de timestamp.

Esses itens não devem ser simulados nem preenchidos com segredos de exemplo.

## Comandos locais

```powershell
npm run release:verify
npm run build
npm run test:e2e:desktop
npm run release:smoke
npm run release:signed
```

`release:signed` exige `JEVRADAR_UPDATER_PUBLIC_KEY`, `JEVRADAR_UPDATER_ENDPOINT`,
`TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`,
`WINDOWS_CERTIFICATE_THUMBPRINT` e `JEVRADAR_TIMESTAMP_URL`. O arquivo de configuração
é temporário e não grava chaves privadas no repositório.

O plugin de atualização é compilado e registrado somente nesse caminho assinado. Builds
locais comuns não recebem um canal incompleto nem tentam consultar endpoints ausentes.

O menu `npm run ops` oferece as mesmas rotinas de forma interativa.
