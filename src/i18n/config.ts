import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { en } from "@/i18n/locales/en";
import { ptBR } from "@/i18n/locales/pt-BR";

const storedLanguage = window.localStorage.getItem("jevradar.language");
const language = storedLanguage === "en" ? "en" : "pt-BR";

void i18n.use(initReactI18next).init({
  resources: {
    "pt-BR": { translation: ptBR },
    en: { translation: en },
  },
  lng: language,
  fallbackLng: "pt-BR",
  interpolation: { escapeValue: false },
});

export { i18n };
