/**
 * TanStack Start injects its own client entry via src/start.ts. This file is
 * kept for spec parity: it demonstrates the standard React 19 bootstrap and
 * can be used by tooling that expects a `main.tsx` entry point.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

const el =
  typeof document !== "undefined" ? document.getElementById("root") : null;
if (el && !(window as any).__TSR__) {
  createRoot(el).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
