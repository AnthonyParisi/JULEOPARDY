/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import os from 'node:os'

// Find the first non-internal IPv4 address so phones on the same Wi-Fi can
// reach the dev server. Prefers private LAN ranges (10/8, 172.16/12, 192.168/16)
// and skips loopback / link-local / VPN-y interfaces when possible.
const detectLanIp = (): string => {
  const ifaces = os.networkInterfaces()
  const candidates: string[] = []
  for (const list of Object.values(ifaces)) {
    if (!list) continue
    for (const net of list) {
      if (net.family !== 'IPv4') continue
      if (net.internal) continue
      candidates.push(net.address)
    }
  }
  const isPrivate = (ip: string) =>
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  const isLinkLocal = (ip: string) => ip.startsWith('169.254.')

  const privateAddr = candidates.find(isPrivate)
  if (privateAddr) return privateAddr
  const nonLinkLocal = candidates.find((c) => !isLinkLocal(c))
  if (nonLinkLocal) return nonLinkLocal
  return candidates[0] || ''
}

const LAN_IP = detectLanIp()
if (LAN_IP) {
  // eslint-disable-next-line no-console
  console.log(`\n  🎉 Jeopardy join URL (share with phones): http://${LAN_IP}:5173/\n`)
}

// Inject the detected LAN IP into index.html as `window.__JEOPARDY_LAN_HOST__`.
// We bypass `import.meta.env.*` here because Vite intentionally ignores
// `define` overrides for that namespace and process.env injection isn't picked
// up at runtime. A global injected via transformIndexHtml is reliable.
const lanHostPlugin = (lanIp: string): Plugin => ({
  name: 'jeopardy-inject-lan-host',
  transformIndexHtml: {
    order: 'pre',
    handler(html) {
      // Inline the IP into a head script. Using string replacement on the
      // template tag below didn't fire reliably from the array-return form,
      // so we patch the HTML directly here.
      const tag = `<script>window.__JEOPARDY_LAN_HOST__=${JSON.stringify(lanIp || '')};</script>`
      return html.replace('<head>', `<head>\n    ${tag}`)
    },
  },
})

export default defineConfig({
  plugins: [react(), lanHostPlugin(LAN_IP)],
  // Relative base so the build works whether the site lives at /, on GitHub
  // Pages under /<repo-name>/, or anywhere else under a subdirectory.
  // `import.meta.env.BASE_URL` becomes './' in prod, '/' in dev.
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    exclude: ['node_modules', 'dist', 'e2e/**', '.claude/**', 'deploy/**'],
  },
})
