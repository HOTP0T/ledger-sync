import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

// https://vite.dev/config/
const isGitHubPages = process.env.GITHUB_PAGES === 'true'
// Disable the PWA service worker for embedded/container builds: a precaching SW
// inside the Gnos3 iframe can serve a stale app shell after an image rebuild.
const disablePwa = process.env.LEDGER_SYNC_DISABLE_PWA === 'true'

export default defineConfig({
  // GitHub Pages / custom domain serves from /ledger-sync/ subpath; local dev uses root
  base: isGitHubPages ? '/ledger-sync/' : '/',
  plugins: [
    react(),
    ...(disablePwa ? [] : [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'theme-init.js'],
      // The manifest is the static public/site.webmanifest (Gnos3 Brand Kit icons), linked
      // from index.html, so builds without the service worker (the Gnos3 module image,
      // LEDGER_SYNC_DISABLE_PWA) ship the same manifest. Icon paths in it are relative,
      // so it also works under the /ledger-sync/ GitHub Pages base.
      manifest: false,
      workbox: {
        // App shell only: precache JS/CSS/HTML/SVG/PNG emitted by Vite.
        // API responses are intentionally NOT cached -- financial data must be fresh.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: 'index.html',
        // Don't let the SW intercept /api/* -- always hit the network.
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
      devOptions: {
        // Disabled in dev to avoid caching interfering with HMR.
        enabled: false,
      },
    }),
    ]),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Never ship source maps to production — exposes original source (CWE-615)
    sourcemap: false,
    rollupOptions: {
      output: {
        // Vite 8 (Rolldown) removed the object form of manualChunks; the
        // function form splits heavy vendor libs into their own cached chunks.
        manualChunks(id) {
          if (/node_modules\/(react|react-dom|react-router-dom)\//.test(id)) return 'vendor-react'
          if (/node_modules\/recharts\//.test(id)) return 'vendor-recharts'
          if (/node_modules\/framer-motion\//.test(id)) return 'vendor-motion'
          if (/node_modules\/@tanstack\/react-query\//.test(id)) return 'vendor-tanstack'
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
