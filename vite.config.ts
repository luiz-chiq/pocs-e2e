import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        id: './',
        name: 'Polígonos no mapa',
        short_name: 'Polígonos',
        description: 'Desenhe, edite e salve polígonos no mapa.',
        lang: 'pt-BR',
        theme_color: '#123c34',
        background_color: '#f4f6f2',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ]
})
