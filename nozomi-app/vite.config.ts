import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { VitePWA } from 'vite-plugin-pwa'
import { devNetworkUrlsPlugin } from './plugins/devNetworkUrls'
import { createResolveAliases } from './alias.config'

export default defineConfig(({ command }) => ({
  resolve: {
    alias: createResolveAliases(),
  },
  plugins: [
    ...(command === 'serve' ? [basicSsl()] : []),
    devNetworkUrlsPlugin(),
    react(),
    tailwindcss(),
    VitePWA({
      devOptions: { enabled: false },
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Nozomi',
        short_name: 'Nozomi',
        description: 'Futuristic Japanese learning companion',
        theme_color: '#05070a',
        background_color: '#05070a',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        // Avoid precaching huge runtime assets (WASM, language JSON) — they OOM mobile tabs.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: ['**/ort-wasm*.wasm', '**/data/**'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  optimizeDeps: {
    // Keep ORT + transformers on their published ESM graph (avoids wasm/version skew in prebundle).
    exclude: ['@huggingface/transformers', 'onnxruntime-web'],
  },
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    allowedHosts: true,
    // No COOP/COEP — they break Web Speech live captions; Whisper runs single-threaded WASM.
    hmr: {
      protocol: 'wss',
      // Match HTTPS dev port when testing on phone over LAN (avoids spurious full reloads).
      clientPort: 5173,
      overlay: false,
    },
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
  },
}))
