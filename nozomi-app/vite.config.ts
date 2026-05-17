import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { VitePWA } from 'vite-plugin-pwa'
import { devNetworkUrlsPlugin } from './plugins/devNetworkUrls'

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  plugins: [
    basicSsl(),
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
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        maximumFileSizeToCacheInBytes: 28 * 1024 * 1024,
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
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    allowedHosts: true,
    hmr: {
      protocol: 'wss',
    },
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
  },
})
