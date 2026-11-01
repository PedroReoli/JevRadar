# Release Windows

## O que já está automatizado

- Validação de TypeScript, ESLint, Vitest, Rust, formatação e build web.
- Conferência de versão entre `package.json`, `Cargo.toml` e `tauri.conf.json`.
- Build NSIS por usuário, com instalador em português e inglês.
- Smoke test Playwright no WebView2 real do executável compilado, com perfil temporário isolado.
- Criação de release rascunho no GitHub para tags `v*`.

## O que exige credenciais externas

O workflow produz um instalador funcional, mas não afirma identidade editorial no Windows enquanto não houver certificado de assinatura de código. A assinatura Authenticode requer certificado ou provedor de assinatura escolhido pelo mantenedor.

A atualização automática também permanece desabilitada até existirem:

1. repositório remoto definitivo e URL pública de releases;
2. par de chaves do updater Tauri, com a chave privada fora do Git;
3. chave pública registrada na configuração do aplicativo;
4. política explícita de atualização e rollback.

Esses itens não devem ser simulados nem preenchidos com segredos de exemplo.

## Comandos locais

```powershell
npm run release:verify
npm run build
npm run test:e2e:desktop
npm run release:smoke
```

O menu `npm run ops` oferece as mesmas rotinas de forma interativa.
