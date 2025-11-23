import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    extensions: ['.ts', '.js', '.tsx', '.jsx'],
    alias: {
      '@framework': path.resolve(__dirname, './src/utils/Models2D/Framework/src')
    }
  },
  plugins: [
    react(),
    VitePWA({
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4 MB
      },
      registerType: 'autoUpdate',
      manifest: {
        "short_name": "MAIQ",
        "name": "MyAvatarIQ",
        "icons": [
          {
            "src": "/vite.svg",
            "sizes": "any",
            "type": "image/svg+xml"
          },
        ],
        "start_url": ".",
        "display": "fullscreen",
        "theme_color": "#000000",
        "background_color": "#ffffff"
      }
    })
  ],
})
