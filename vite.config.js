import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 1500,
  },
  plugins: [
  vue(),
  VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
          name: "Apo's TwineIDE",
          short_name: "TwineIDE",
          description: "一个用于Twee的编辑器",
          start_url: "./index.html",
          display: "standalone",
          background_color: "#1e1e1e",
          theme_color: "#007acc",
          icons: [
            {
              src: "https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/2728.png",
              sizes: "72x72",
              type: "image/png",
              purpose: 'any maskable'
            },
            {
              src: "https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/512x512/2728.png",
              sizes: "512x512",
              type: "image/png",
              purpose: 'any maskable'
            }
          ]
        },
      workbox: {
        cacheId: `twine-ide-${pkg.version}`,
        globPatterns: ['**/*.{js,css,html,png,svg,ico}']
      }
    })
    ],
})