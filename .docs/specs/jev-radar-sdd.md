# JevRadar — Software Design Specification

**Status:** aprovado para implementação

**Versão:** 0.1

**Data:** 2026-11-01

## Produto

JevRadar é um aplicativo desktop local-first para investidores individuais. Ele coleta conteúdo público e dados de mercado, usa exclusivamente o Jev para decisões tipadas, agrega sentimento e relevância e mede historicamente o que ocorreu após sinais semelhantes.

O foco inicial é Brasil, com PT-BR e inglês desde o primeiro release. Windows é a primeira plataforma; Linux vem depois. macOS não faz parte do roadmap atual.

## Limite regulatório

O produto apresenta fatos, relações, incerteza, sentimento, relevância e resultados históricos. Não recomenda compra ou venda, não informa tamanho de posição, não executa ordens e não apresenta ativos como garantia de retorno.

Uma faixa opcional de patrimônio pode adaptar linguagem, densidade e contexto educacional. Ela não pode personalizar recomendações. Ativos com pouca discussão podem ser apresentados como `baixa atenção com indicadores observados`, sempre com critérios e fontes, nunca como `bons ativos`.

## Modelo de distribuição

O JevRadar adota open core local:

- aplicação desktop, contratos, integrações, adapters e agregação descritiva permanecem no repositório público sob Apache-2.0;
- o motor preditivo avançado é um módulo privado com contrato versionado;
- o aplicativo público continua utilizável sem o módulo privado;
- um binário local privado dificulta cópia, mas não impede engenharia reversa;
- a arquitetura pode mover o motor privado para um serviço remoto no futuro, mediante nova decisão arquitetural.

Código privado não deve depender apenas de `.gitignore` como estratégia de preservação. Ele deve possuir repositório privado e processo próprio de versionamento quando começar a ser implementado.

## Arquitetura

- Tauri com core Rust e tarefas assíncronas.
- React e TypeScript na interface.
- SQLite como fonte de verdade local.
- Sem sidecar Python no primeiro release.
- API REST opcional em loopback, desabilitada por padrão, autenticada por token e documentada com OpenAPI/Swagger.
- Credenciais fornecidas pelo usuário no wizard ou nas configurações e armazenadas no keychain.
- Sem backend obrigatório do JevRadar na nuvem.
- A API do Jev e os providers de dados permanecem externos.

## Background

O usuário escolhe o comportamento ao fechar: perguntar, minimizar para a bandeja ou encerrar. Coleta em background e inicialização com Windows são opções independentes. Inicialização com Windows vem desligada por padrão. Encerrar explicitamente interrompe toda coleta.

## Fontes

O primeiro release inclui Reddit, RSS/notícias, Binance, brapi e Banco Central. X é opcional e BYOK. Novas fontes usam adapters isolados.

APIs oficiais são preferidas. Scraping é permitido somente quando termos, robots e acesso público permitirem, sem burlar autenticação, paywall ou proteções. Conteúdo bruto tem retenção mínima e não é incluído no repositório.

## Ativos

O catálogo pode ser amplo, mas cada watchlist monitora inicialmente até 50 ativos. O pipeline faz pré-filtro determinístico por ticker, nome e aliases antes de consultar o Jev.

Classes planejadas incluem ações B3, FIIs, ETFs, índices, renda fixa de referência, cripto e, posteriormente, mercados internacionais.

## Pipeline de sinal

A unidade de análise é `documento × ativo`. O Jev classifica referência ao ativo, sentimento, relevância, tipo de conteúdo, alegação factual e risco de hype/coordenação. O sistema registra probabilidades, confiança quando fornecida, modelo exato, versão das perguntas, idioma e timestamps.

O peso agregado combina, de forma versionada e auditável:

`sentimento × relevância × confiança × peso do tipo × credibilidade observada da fonte × diversidade × recência × penalidade de duplicação/hype`

O Jev não decide sozinho o peso final. O código controla fórmulas, limiares e efeitos. Pesos serão calibrados em corpus rotulado e comparados com baselines.

## Relações macro e geopolíticas

O sistema identifica eventos políticos, econômicos, regulatórios, climáticos, sanitários, tecnológicos e geopolíticos e os relaciona a países, setores, commodities, moedas e ativos.

Relatórios usam templates determinísticos e fontes rastreáveis. O produto diferencia fato observado, relação conhecida, correlação, hipótese e causalidade não comprovada. O Jev não gera narrativa livre.

## Dashboard

O dashboard oferece mapa de calor, timeline, preço com sentimento sobreposto, cobertura, confiança, diversidade de fontes, eventos, filtros, watchlists e metodologia. Todo estilo parte de design tokens centralizados; páginas são orquestradores enxutos e as responsabilidades seguem as camadas definidas nas regras de engenharia.

## Alertas

Alertas são configuráveis por ativo, fonte, janela, horário silencioso e nível:

1. informativo;
2. relevante;
3. forte;
4. crítico.

O nível representa intensidade e qualidade observada do evento, não recomendação de ação. Alertas nunca usam linguagem de compra, venda, entrada, lucro ou oportunidade garantida.

## Backtest

Backtests usam `classified_at`, versão fixa do modelo e perguntas, calendário de mercado e somente dados disponíveis naquele instante. Resultados separam calibração e período fora da amostra, mostram tamanho da amostra, baseline, intervalos de confiança e resultados negativos.

Horizontes iniciais: 1, 7 e 30 dias quando houver histórico suficiente.

## Privacidade e telemetria

Telemetria externa fica desligada por padrão. Métricas operacionais são locais. Crash reporting poderá ser adicionado depois como opt-in separado. O usuário pode exportar e apagar dados locais.

## Licença

O repositório público usa Apache License 2.0. O motor privado não é coberto por essa licença.

## Critérios globais de aceite

- O app público funciona sem o motor privado, com recursos descritivos reais.
- Nenhum segredo aparece no frontend, banco, logs ou repositório.
- Falha de uma fonte degrada apenas aquela integração.
- Sinais são auditáveis até suas fontes e versões.
- Baixa confiança não influencia silenciosamente o sinal principal.
- Nenhum backtest usa dados posteriores ao instante avaliado.
- Interface completa existe em PT-BR e inglês.
- Coleta em background respeita as escolhas do usuário.
- API local, quando habilitada, possui token, OpenAPI e limites seguros.

## Referências normativas internas

- `.rules/JEVRADAR-ENGINEERING.md`
- `.agents/rules/RULES-ROUTER.json`
- `.agents/SKILLS-ROUTER.json`
