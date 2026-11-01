# Contrato público do motor preditivo v1

**Identificador:** `jev-radar-predictive-v1`

**Estado:** contrato disponível; motor privado não implementado neste repositório

## Limite

O aplicativo público não depende do motor preditivo. Este contrato define somente a fronteira futura entre o JevRadar e um módulo versionado em repositório privado.

O request contém sinais agregados e resultados históricos. Ele não contém texto bruto, credenciais, perfil financeiro do usuário ou instruções de compra e venda.

## Entrada

- ativo e instante `asOf`;
- versão da metodologia pública do sinal;
- score, confiança, diversidade, volume de evidências e penalidade de hype;
- resultados históricos já calculados pelo núcleo público.

## Saída

- versão do contrato e do motor;
- estado `available`, `insufficient_data` ou `unavailable`;
- tamanho da amostra de casos semelhantes;
- taxas históricas, baseline, intervalo e confiabilidade para 1, 7 ou 30 dias;
- limitações explícitas.

A saída não possui campos de recomendação, ordem, posição, preço-alvo, retorno garantido, `buy` ou `sell`.

## Validação

O núcleo público rejeita versão incompatível, ativo divergente, horizonte não suportado, probabilidades fora de `0..1` e intervalo invertido. Um adapter privado futuro deve implementar o trait `PredictiveEngine` sem modificar este contrato de forma incompatível.

## Versionamento e distribuição

Mudanças incompatíveis exigem novo identificador e novo ADR. Código, pesos, datasets e artefatos do motor não pertencem a `.privado/` como única cópia: devem viver em repositório privado com versionamento e backup próprios.
