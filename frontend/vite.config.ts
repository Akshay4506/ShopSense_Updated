import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(() => ({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'ShopSense - Smart Dukaan Management',
        short_name: 'ShopSense',
        description: 'Manage your inventory, billing, and reports with ease.',
        theme_color: '#166534',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}));
