# Contrato TypeSafe System One usado pelo JevRadar

**Revisado em:** 2026-11-01  
**Contrato interno de perguntas:** `document-market-signal-v2`  
**Modelo solicitado:** `jev-latest`

## Fonte externa verificada

- índice oficial: <https://docs.typesafe.ai/llms.txt>;
- OpenAPI oficial: <https://api.typesafe.ai/openapi.json>;
- endpoint usado: `POST https://api.typesafe.ai/v1/systemone`.

O OpenAPI externo é a fonte de verdade para o envelope HTTP. A versão interna acima
identifica o significado das perguntas do JevRadar e não substitui a versão do provider.

## Request

O adapter envia somente texto e metadados do documento, candidatos encontrados pelo
pré-filtro determinístico e perguntas independentes do tipo `choice`, `score` e `noul`.
Nenhuma imagem, credencial adicional, perfil financeiro ou instrução de investimento é
incluída no estado.

## Resposta aceita

Antes de persistir uma análise, o core exige:

- modelo efetivamente usado não vazio;
- discriminador `type` compatível com cada pergunta;
- `choice` pertencente exatamente às opções enviadas;
- probabilidades finitas, entre zero e um, com todas as opções e soma aproximada de um;
- opção selecionada com probabilidade máxima;
- `score` entre zero e três, acompanhado pelos quatro níveis de `legend` e `probabilities`;
- score coerente com a média ponderada dos níveis;
- `noul` finito entre zero e um;
- contagens de tokens de entrada e saída registradas localmente.

Contrato ausente, incompleto ou inconsistente resulta em `jev_invalid_payload`; nenhuma
parte da análise é persistida. Confiança abaixo do limiar gera estado incerto ou ausência
de vínculo, nunca um ativo inventado.

## Limites da validação

Os testes locais validam request, parsing e rejeição defensiva com fixtures aderentes ao
OpenAPI. Uma chamada real não é executada no CI porque depende da chave pessoal do usuário,
de cota e da disponibilidade externa do provider.
