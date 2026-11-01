# Política de segurança

## Versões suportadas

Enquanto o JevRadar estiver em alpha, apenas a revisão mais recente da branch principal recebe correções de segurança.

## Reporte responsável

Não abra uma issue pública para vulnerabilidades. Envie um relato privado ao mantenedor pelo canal de segurança configurado no repositório GitHub, incluindo impacto, passos mínimos de reprodução e versão afetada. Não inclua credenciais ou dados pessoais reais.

## Limites de segurança

- A API local deve permanecer em loopback e exigir bearer token.
- Segredos devem permanecer no keychain do sistema.
- Logs, screenshots, fixtures, exports e relatórios não podem conter tokens.
- Coleta deve respeitar termos, rate limits e minimização de dados.
- O aplicativo não executa ordens nem recebe credenciais de corretora.

Se houver suspeita de vazamento, revogue primeiro a chave no provedor correspondente e gere um novo token da API local nas configurações.
