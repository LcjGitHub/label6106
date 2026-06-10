import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      visualizer({
        open: false,
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
      }),
    ],
    server: {
      port: 4101,
      strictPort: true,
      open: false,
    },
    preview: {
      port: 4101,
      strictPort: true,
    },
    define: {
      __APP_ENV__: JSON.stringify(env.VITE_APP_ENV),
    },
    build: {
      target: 'es2015',
      outDir: 'dist',
      sourcemap: mode !== 'production',
      minify: 'esbuild',
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react/jsx-runtime'],
          },
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        },
      },
      esbuild: {
        drop: mode === 'production' ? ['console', 'debugger'] : [],
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
      esbuildOptions: {
        target: 'es2020',
      },
    },
  }
})
