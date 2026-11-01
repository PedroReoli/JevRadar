# Changelog

Todas as mudanças relevantes do JevRadar serão documentadas neste arquivo. O projeto segue Semantic Versioning para tags de release.

## [0.1.0-alpha.1] — 2026-11-01

### Adicionado

- aplicativo Tauri para Windows com bandeja, background configurável e inicialização opt-in;
- wizard PT-BR/inglês, perfil de leitura e credenciais no Windows Credential Manager;
- catálogo e watchlist local com limite de 50 ativos;
- coleta real de Binance, brapi, Banco Central, RSS e Reddit oficial;
- classificação tipada pelo Jev para ativo, sentimento, relevância, tipo, alegação factual, hype e contexto externo;
- agregação auditável de sinais com confiança, diversidade e penalidade de hype;
- dashboard com filtros na URL, preço × sentimento, timeline de contexto e lacunas de cobertura;
- backtest cronológico em 1, 7 e 30 dias, com calibração/avaliação, baseline e intervalo de confiança;
- quatro níveis progressivos de alerta local;
- API opcional em loopback, bearer token, OpenAPI e Swagger;
- limites configuráveis por lote e por dia para uso do Jev;
- exportação consistente do banco e exclusão confirmada do histórico;
- CI de qualidade, documentação de arquitetura, segurança e contribuição.

### Limitações conhecidas

- release inicial somente para Windows x64;
- X permanece opcional e ainda não possui coletor no núcleo público;
- scraping e fóruns adicionais dependem de revisão específica de termos e `robots.txt`;
- classificação ao vivo exige uma chave TypeSafe/Jev do usuário;
- notificações do Windows devem ser avaliadas no aplicativo instalado, pois builds de desenvolvimento podem usar identidade diferente;
- resultados históricos dependem do volume acumulado e são exploratórios em amostras pequenas.
