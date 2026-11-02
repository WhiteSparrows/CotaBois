import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'
import type { Plugin } from 'vite'

const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "base-uri 'none'",
  "form-action 'none'"
].join('; ')

/** Uniquement à la compilation : le serveur de développement a besoin de scripts en ligne. */
function contentSecurityPolicy(): Plugin {
  return {
    name: 'cotabois-content-security-policy',
    apply: 'build',
    transformIndexHtml(html) {
      const meta = `<meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />`
      return html.replace('<head>', `<head>\n    ${meta}`)
    }
  }
}

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    plugins: [react(), contentSecurityPolicy()]
  }
})
