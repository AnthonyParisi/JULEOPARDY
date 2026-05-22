/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ABLY_KEY: string
  readonly VITE_LAN_HOST?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Auto-detected LAN IP injected by vite.config.ts at dev startup. Used so the
// QR code can point at the GM's machine on the network instead of localhost.
// (Vite intentionally ignores `define`/process.env overrides for
// `import.meta.env.*`, so we inject a global via transformIndexHtml instead.)
interface Window {
  __JEOPARDY_LAN_HOST__?: string
}

