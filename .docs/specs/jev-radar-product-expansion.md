# JevRadar — Especificação de expansão do produto

**Status:** aprovado pela solicitação “implemente tudo isso”  
**Data:** 2026-11-01  
**Base:** `jev-radar-sdd.md` e auditoria do alpha `0.2.0-alpha.1`

## Objetivo

Transformar o alpha técnico em um produto navegável e explicável sem alterar seu limite regulatório: o JevRadar apresenta fatos, sinais, relações e resultados históricos, nunca recomenda compra, venda ou tamanho de posição.

## Entregas funcionais

### 1. Exploração de mercado

- Página de ativo com preço, variação, série, sinais, eventos relacionados, evidências e backtests.
- Página de sinal com metodologia, versões, fatores de peso, evidências e vínculos para o ativo.
- Explorador de eventos com filtros por tipo, país, ativo, relação e confiança.
- Estado vazio orienta a coleta real; nenhum mock pode aparecer como dado observado.

### 2. Alertas e histórico

- Central de alertas entregues, com nível, ativo, intensidade, confiança e data.
- Filtros navegáveis por nível e ativo.
- Configurações existentes continuam controlando ativos, fontes, janela silenciosa e sensibilidade.

### 3. Backtests e relatórios

- Histórico paginado de execuções por ativo e versão.
- Comparação de resultados em 1, 7 e 30 dias sem misturar contratos de sinal.
- Central de relatórios com exportação local, inventário das versões e atalhos para sinais e backtests.

### 4. Operação e fontes

- Central operacional com execuções de coleta, falhas isoladas por fonte, volume armazenado e uso diário do Jev.
- Página de detalhe de fonte com estado, método, última coleta, erros e documentos acumulados.
- Onboarding pós-wizard conduz o usuário por watchlist, credenciais, coleta, classificação e primeiro sinal.

### 5. Cobertura de ativos e conteúdo

- Catálogo inicial amplo para B3, FIIs/ETFs, cripto e indicadores macro.
- Descoberta/sincronização de ativos por providers públicos quando o contrato permitir.
- Novas fontes oficiais e feeds públicos versionados; scraping somente por adapter específico após termos e `robots.txt`.
- O limite de 50 ativos monitorados continua sendo imposto no banco.

### 6. Distribuição

- Build Windows reproduzível, smoke test do executável e E2E dos fluxos principais.
- Pipeline preparado para assinatura do instalador e atualização automática.
- Assinatura/publicação efetiva dependem de certificado, chave de atualização e endpoint de release fornecidos pelo mantenedor; ausência desses itens deve falhar de forma explícita, nunca gerar falsa assinatura.

## Read models e persistência

As telas novas usam consultas dedicadas e paginadas. Migrations são somente aditivas. O histórico existente não será recriado nem apagado.

- `AssetDetail`: snapshot, séries, sinais, eventos e último backtest do ativo.
- `SignalReport`: sinal versionado e suas evidências.
- `AlertHistoryItem`: entrega local ligada ao sinal e ao ativo.
- `CollectionRunDetail`: execução e resultados por fonte.
- `BacktestHistoryItem`: execução e métricas por horizonte.
- `JevUsageSnapshot`: consumo local agregado, sem chave ou texto bruto.

## Navegação

Rotas reproduzíveis:

- `/signals?period=&direction=&asset=&confidence=`
- `/feed?q=&source=&type=&sentiment=&status=&confidence=&page=`
- `/assets/:assetId`
- `/signals/:signalId`
- `/alerts?level=&asset=`
- `/events?type=&country=&asset=&confidence=`
- `/backtests?asset=&page=`
- `/operations?status=&source=&page=`
- `/sources/:sourceId`
- `/reports`
- `/getting-started`

Filtros, seleção, ordenação e paginação permanecem na URL. Segredos e conteúdo bruto nunca entram na rota.

## Critérios de aceite

- Cada rota possui loading, vazio, erro e retry quando aplicável.
- Dados retornados pelo core são validados no frontend.
- Consultas de listas são limitadas e indexadas.
- Interface completa em PT-BR e inglês, navegável por teclado e sem overflow em desktop/mobile.
- Sinal, evento e backtest preservam proveniência e linguagem de incerteza.
- Testes Rust cobrem queries, limites e migrações; Vitest cobre contratos e estados; Playwright cobre navegação real.
- `npm run check`, `cargo test` e `npm run build` passam antes da tag integrada.
