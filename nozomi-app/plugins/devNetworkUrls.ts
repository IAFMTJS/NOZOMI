import type { Plugin, ViteDevServer } from 'vite'

const VIRTUAL_ID = 'virtual:nozomi-dev-urls'
const RESOLVED_ID = '\0' + VIRTUAL_ID

function readNetworkUrls(server: ViteDevServer): string[] {
  return server.resolvedUrls?.network ?? []
}

/** Injects LAN dev URLs for mobile testing (HTTPS + mic). */
export function devNetworkUrlsPlugin(): Plugin {
  let networkUrls: string[] = []

  const refreshUrls = (server: ViteDevServer) => {
    networkUrls = readNetworkUrls(server)
  }

  return {
    name: 'nozomi-dev-network-urls',
    apply: 'serve',
    configureServer(server) {
      const onListen = () => refreshUrls(server)
      server.httpServer?.once('listening', onListen)
      server.httpServer?.on('listening', onListen)
    },
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
    },
    load(id) {
      if (id === RESOLVED_ID) {
        return `export const devNetworkUrls = ${JSON.stringify(networkUrls)}`
      }
    },
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        if (!networkUrls.length) return html
        const script = `<script>window.__NOZOMI_DEV_URLS__=${JSON.stringify(networkUrls)}</script>`
        return html.replace('</head>', `${script}</head>`)
      },
    },
  }
}
