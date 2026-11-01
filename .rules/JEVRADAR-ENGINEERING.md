# Regras de Engenharia — JevRadar

Estas regras são obrigatórias para toda implementação do JevRadar. Em conflito, prevalecem as instruções de maior prioridade e a especificação aprovada do produto.

## 1. Modularização estrita

- É proibido concentrar apresentação, estado, estilos, acesso a dados e regra de negócio em um único arquivo.
- O frontend deve separar responsabilidades em `types/`, `styles/`, `services/`, `hooks/`, `components/` e `pages/`.
- `pages/` apenas compõe a tela e coordena módulos. Meta: 150–250 linhas; teto absoluto: 750 linhas.
- Hooks não fazem HTTP diretamente. Services não mantêm estado React. Componentes visuais não conhecem detalhes de transporte ou persistência.
- O core Rust deve separar domínio, casos de uso, portas, adapters, persistência, tarefas em background e interface HTTP local.
- Nomes genéricos como `utils`, `helpers`, `common` e `manager` são proibidos quando houver um nome de domínio mais preciso.

## 2. Design system orientado por tokens

- Cores, tipografia, espaçamentos, raios, sombras, elevação, motion e breakpoints devem vir de tokens centralizados.
- É proibido inserir valores visuais arbitrários repetidos em componentes ou páginas.
- Componentes compartilhados evoluem por contratos retrocompatíveis e props opcionais com padrões neutros.
- Tipos de props ficam em arquivos dedicados quando o componente possuir contrato não trivial.
- Não usar emojis como ícones de interface; usar ícones vetoriais acessíveis.
- Toda tela deve ser utilizável com teclado, zoom e diferentes densidades, respeitando `prefers-reduced-motion`.

## 3. Estado navegável

- Filtros, período, agrupamento, ordenação, paginação, ativo selecionado e modo de visualização devem ser refletidos na rota/query quando isso tornar a visão reproduzível.
- Segredos, dados pessoais, conteúdo bruto e estado transitório não podem ir para a URL.
- Estado global só existe quando for realmente compartilhado; estado local permanece próximo de quem o consome.

## 4. Dados reais, cache controlado e proveniência

- É proibido mascarar falhas de produção com mocks, fixtures ou fallbacks estáticos apresentados como dados reais.
- Cache não é banido: coleta em background, modo offline, rate limits e backtests exigem persistência controlada.
- Todo dado persistido deve registrar fonte, horário de publicação, coleta, atualização, versão e condição de expiração quando aplicável.
- Atualização manual invalida apenas as chaves afetadas e nunca apaga silenciosamente histórico necessário ao backtest.
- Requests externos usam timeout explícito, retry limitado, backoff com jitter e respeito a `Retry-After`.
- Cache-busting só pode ser usado quando necessário e permitido pelo provider; não deve desperdiçar cota nem impedir ETag/Last-Modified.

## 5. Sinais e indicadores

- O Jev classifica dimensões estreitas; o código controla pesos, agregação, limiares e efeitos.
- Um sinal deve ser auditável até as fontes que o compõem.
- Duplicatas e republicações da mesma origem não contam como fontes independentes.
- Micro-KPIs usam tokens semânticos de estado, legenda textual e acessibilidade; cor nunca é o único meio de comunicar significado.
- Indicadores de hype, geopolítica ou causalidade são apresentados como evidência e hipótese, nunca como acusação ou certeza.

## 6. Segurança e privacidade

- Credenciais ficam no keychain do sistema; nunca no frontend, SQLite, logs ou telemetria.
- A API local é desabilitada por padrão, limitada a loopback e protegida por token quando habilitada.
- Swagger/OpenAPI não pode revelar segredos nem oferecer mutações perigosas sem autorização explícita.
- Telemetria externa é opt-in. Métricas operacionais permanecem locais por padrão.
- Conteúdo coletado segue minimização, retenção configurável e termos da fonte.

## 7. Identificadores e contratos

- Identificadores externos são validados e normalizados na borda.
- Não presumir ticker, país, moeda, bolsa, timezone, sessão ou entidade a partir de convenções implícitas.
- DTOs de transporte não são entidades de domínio.
- Alterações de contrato devem manter compatibilidade ou incluir migração/versionamento explícito.

## 8. Commits e tags

- Fazer muitos commits úteis, mas nenhum commit artificial ou incompleto.
- Cada commit representa uma entrega lógica concluída, revisável e validada.
- Assim que uma entrega lógica satisfizer a Definition of Done, criar seu commit antes de iniciar outra demanda; não acumular entregas concluídas no working tree.
- Não misturar demandas independentes no mesmo commit.
- Não separar arquivos da mesma responsabilidade apenas para aumentar a quantidade de commits.
- Usar Conventional Commits em PT-BR: `tipo(escopo): descrição`.
- Antes de cada commit: revisar o diff staged, confirmar ausência de segredos e executar validação proporcional ao risco.
- Uma tela com seus componentes, hooks, services, integração e testes pode formar um commit quando constituir uma única entrega funcional.
- Tags são reservadas para marcos integrados, executáveis e validados; não são criadas automaticamente por tela.
- Tags de pré-release seguem SemVer, por exemplo `v0.1.0-alpha.1`.

## 9. Definition of Done

Uma demanda só está concluída quando:

- o comportamento e os estados de erro previstos na Spec foram implementados;
- testes proporcionais ao risco foram executados;
- loading, vazio, erro, offline e permissão foram considerados;
- acessibilidade, responsividade e internacionalização foram verificadas;
- logs e métricas não expõem segredos;
- documentação e contratos afetados foram atualizados;
- o diff não contém mudanças alheias à demanda.
