# Changelog

Todas as mudanças relevantes do JevRadar serão documentadas neste arquivo. O projeto segue Semantic Versioning para tags de release.

## [0.2.0-alpha.1] — 2026-11-01

### Adicionado

- coletor oficial opcional do X com credencial BYOK e consulta limitada pela watchlist;
- feeds RSS personalizados para fóruns, blogs e publicações com feed público;
- mapa de calor de sinais e contexto educacional adaptado ao perfil de leitura;
- filtros de alertas por ativos e fontes, janela de silêncio e quatro níveis configuráveis;
- evidências completas por sinal na interface e na API local;
- contrato público versionado para um futuro motor preditivo privado, sem texto bruto ou campos de recomendação.

### Alterado

- metodologia de sinal `weighted-sentiment-v2`, com credibilidade histórica da fonte, recência, diversidade, duplicação e fatores auditáveis;
- backtests, alertas e séries passam a usar um único conjunto coerente de versões de metodologia, modelo e perguntas;
- integrações externas usam timeout, retry limitado, backoff com jitter e `Retry-After`; o Jev só repete chamadas em rate limit para evitar cobrança ambígua;
- conteúdo social expirado é anonimizado, preservando a trilha agregada de auditoria.

### Limitações conhecidas

- release somente para Windows x64;
- chamadas ao vivo do Jev e do X dependem das credenciais e dos planos do próprio usuário;
- scraping de fóruns adicionais exige revisão individual de termos e `robots.txt`;
- notificações visuais precisam ser confirmadas no aplicativo instalado;
- resultados históricos continuam exploratórios quando a amostra é pequena.

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
