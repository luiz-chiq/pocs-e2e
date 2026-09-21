import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Tarefas POC',
        short_name: 'Tarefas',
        description: 'POC de aplicação reutilizável para PWA, Electron e Android',
        theme_color: '#183b62',
        background_color: '#edf4fa',
        display: 'standalone',
        start_url: '/',
        icons: []
      }
    })
  ]
})
