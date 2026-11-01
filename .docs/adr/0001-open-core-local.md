# ADR 0001 — Adotar open core com motor preditivo local privado

**Status:** aceito

**Data:** 2026-11-01

**Responsável:** Pedro Lucas Reis

## Contexto

O JevRadar deve ser utilizável, auditável e apresentável como projeto open source, sem entregar integralmente a camada preditiva que representa seu principal diferencial. O produto também deve operar localmente e sem backend próprio obrigatório na nuvem.

## Decisão

O repositório público conterá aplicação desktop, UI, contratos, integrações, adapters e agregação descritiva sob Apache-2.0. O motor preditivo avançado será um módulo privado com contrato versionado. A versão pública permanecerá funcional sem esse módulo.

O contrato inicial está documentado em [predictive-engine-v1](../contracts/predictive-engine-v1.md) e tipado em `src-tauri/src/domain/prediction.rs`. Ele transporta somente sinais agregados e resultados históricos, nunca conteúdo bruto ou credenciais.

O código privado terá repositório privado próprio quando sua implementação começar. `.gitignore` protege apenas o checkout público e não substitui versionamento ou backup.

## Alternativas rejeitadas

- **Tudo open source:** maximiza transparência, mas entrega o principal diferencial copiável.
- **Motor exclusivamente remoto desde o início:** protege melhor a propriedade intelectual, mas cria custo operacional, autenticação, disponibilidade e uma fronteira de privacidade antes de existir validação de usuários.

## Consequências

- A interface entre aplicação pública e motor privado precisa ser estreita e versionada.
- Recursos descritivos devem funcionar sem o motor privado.
- Um binário local privado pode sofrer engenharia reversa; esta decisão dificulta cópia, mas não a impede.
- Uma migração futura para serviço remoto exigirá novo ADR, modelo de custos e revisão de privacidade.

## Gatilhos de revisão

- Uso comercial relevante.
- Cópia ou engenharia reversa observada.
- Necessidade de sincronização entre dispositivos.
- Custo aceitável para operar backend remoto.
- Requisito de atualização do motor sem redistribuir o aplicativo.
