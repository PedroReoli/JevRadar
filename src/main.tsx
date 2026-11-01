import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@/app/App";
import "@/i18n/config";
import "@/styles/tokens.css";
import "@/styles/globals.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Elemento raiz da aplicação não foi encontrado.");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
