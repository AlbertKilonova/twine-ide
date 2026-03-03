import { fileURLToPath, URL } from 'node:url'
import {
    defineConfig
} from 'vite'
import vue from '@vitejs/plugin-vue'
import {
    VitePWA
} from 'vite-plugin-pwa'
import pkg from './package.json'

// https://vite.dev/config/
export default defineConfig({
    base: './',
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    build: {
        chunkSizeWarningLimit: 1500,
    },
    server: {
        headers: {
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp'
        },
        fs: {
            allow: ['..']
        }
    },
    optimizeDeps: {
        exclude: ['tweers-core']
    },
    plugins: [
        vue(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'pwa.png', 'pwa-maskable.png'],
            manifest: {
                name: "TwineIDE",
                short_name: "TwineIDE",
                description: "一个用于Twee的编辑器",
                start_url: "./index.html",
                display: "standalone",
                background_color: "#1e1e1e",
                theme_color: "#007acc",
                icons: [{
                        src: 'pwa.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: 'pwa.png',
                        sizes: '512x512',
                        type: 'image/png'
                    },
                    {
                        src: 'pwa-maskable.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable'
                    },
                    {
                        src: 'favicon.svg',
                        sizes: 'any',
                        type: 'image/svg+xml',
                        purpose: 'any'
                    }
                ]
            },
            workbox: {
                cacheId: `twine-ide-${pkg.version}`,
                globPatterns: ['**/*.{js,css,html,png,svg,ico,wasm}']
            }
        })
    ],
    assetsInclude: ['**/*.svg', '**/LICENSE', '**/*.wasm'],
})