import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // The library is linked via `file:../..` and ships raw TS/TSX source (no
  // build step yet), so Vite needs to transform it like any other source file
  // instead of treating it as a pre-built, pre-bundled dependency.
  optimizeDeps: {
    exclude: ["browser-history-api"],
  },
});
