import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { quasar, transformAssetUrls } from '@quasar/vite-plugin'
import path from 'path'

export default defineConfig({
  plugins: [
    vue({
      template: { transformAssetUrls }
    }),
    quasar({
      sassVariables: 'src/css/quasar-variables.sass'
    })
  ],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'src': path.resolve(__dirname, './src'),
      'layouts': path.resolve(__dirname, './src/layouts'),
      'pages': path.resolve(__dirname, './src/pages'),
      'components': path.resolve(__dirname, './src/components'),
      'boot': path.resolve(__dirname, './src/boot'),
      'router': path.resolve(__dirname, './src/router')
    }
  },

  server: {
    port: 8080,
    open: true
  },

  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['vue', 'vue-router', 'pinia'],
          'quasar': ['quasar'],
          'charts': ['chart.js', 'vue-chartjs']
        }
      }
    }
  }
}) 