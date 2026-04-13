import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/** Baked into the client bundle at `vite build` / dev server start — shown in Settings. */
const appBuildIso = JSON.stringify(new Date().toISOString());

export default defineConfig({
  define: {
    __APP_BUILD_ISO__: appBuildIso,
  },
  plugins: [react(), tailwindcss()],
});
