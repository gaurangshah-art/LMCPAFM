/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_LMCP_INSTITUTIONAL_EMAIL_DOMAINS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
