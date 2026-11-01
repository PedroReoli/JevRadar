import { describe, expect, it } from "vitest";

import { en } from "@/i18n/locales/en";
import { ptBR } from "@/i18n/locales/pt-BR";

type TranslationTree = { readonly [key: string]: string | TranslationTree };

function flattenTranslations(tree: TranslationTree, prefix = ""): Map<string, string> {
  const entries = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") entries.set(path, value);
    else for (const [nestedKey, nestedValue] of flattenTranslations(value, path)) entries.set(nestedKey, nestedValue);
  }
  return entries;
}

function interpolationVariables(value: string): string[] {
  return [...value.matchAll(/{{\s*([^},\s]+)[^}]*}}/g)]
    .flatMap((match) => match[1] ? [match[1]] : [])
    .sort();
}

describe("catálogos de tradução", () => {
  it("mantém as mesmas chaves e variáveis em PT-BR e inglês", () => {
    const portuguese = flattenTranslations(ptBR);
    const english = flattenTranslations(en);

    expect([...english.keys()].sort()).toEqual([...portuguese.keys()].sort());
    for (const [key, value] of portuguese) {
      expect(interpolationVariables(english.get(key) ?? ""), key).toEqual(
        interpolationVariables(value),
      );
    }
  });
});
