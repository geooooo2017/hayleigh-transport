/// <reference types="vite/client" />

/** Injected by `vite.config.ts` `define` at build/dev start. */
declare const __APP_BUILD_ISO__: string;

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
