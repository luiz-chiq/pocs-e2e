import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  preview: { port: 4173, strictPort: true },
  // Preparar as ferramentas de áreas e pontos evita nova otimização ao editar.
  optimizeDeps: { include: ['@arcgis/core/views/draw/support/Reshape.js', '@arcgis/core/views/draw/support/GraphicMover.js'] },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        id: './',
        name: 'Mapa',
        short_name: 'Mapa',
        description: 'Desenhe, edite e salve áreas e pontos no mapa.',
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
