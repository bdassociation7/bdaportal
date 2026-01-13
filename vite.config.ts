import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath, URL } from "node:url";
import tsconfigPaths from "vite-tsconfig-paths";
import { createServer } from "./server";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8082,
    sourcemapIgnoreList: false, // Désactiver l'ignore des source maps
  },
  build: {
    outDir: "dist/spa",
    assetsDir: "assets",
    sourcemap: mode === 'development' ? 'inline' : false,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          query: ['@tanstack/react-query'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs'],
          motion: ['framer-motion'],
          utils: ['clsx', 'tailwind-merge', 'class-variance-authority'],
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.');
          const extType = info?.[info.length - 1];
          if (/\.(css)$/.test(assetInfo.name || '')) {
            return 'assets/css/[name]-[hash].[ext]';
          }
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name || '')) {
            return 'assets/images/[name]-[hash].[ext]';
          }
          if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name || '')) {
            return 'assets/fonts/[name]-[hash].[ext]';
          }
          return 'assets/[name]-[hash].[ext]';
        },
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console.warn and console.error for debugging
        drop_debugger: mode === 'production',
        pure_funcs: ['console.log', 'console.debug', 'console.info'], // Only drop these
      },
      mangle: {
        safari10: true,
      },
    },
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1600,
  },
  plugins: [react(), tsconfigPaths(), expressPlugin()],
  resolve: {
    alias: [
      { find: '@/components', replacement: fileURLToPath(new URL('./client/components', import.meta.url)) },
      { find: '@/contexts', replacement: fileURLToPath(new URL('./client/contexts', import.meta.url)) },
      { find: '@/hooks', replacement: fileURLToPath(new URL('./client/hooks', import.meta.url)) },
      { find: '@/services', replacement: fileURLToPath(new URL('./client/src/services', import.meta.url)) },
      { find: '@/lib', replacement: fileURLToPath(new URL('./client/lib', import.meta.url)) },
      { find: '@/config', replacement: fileURLToPath(new URL('./client/config', import.meta.url)) },
      { find: '@/pages', replacement: fileURLToPath(new URL('./client/pages', import.meta.url)) },
      { find: '@/types', replacement: fileURLToPath(new URL('./client/types', import.meta.url)) },
      { find: '@/app', replacement: fileURLToPath(new URL('./client/src/app', import.meta.url)) },
      { find: '@/shared', replacement: fileURLToPath(new URL('./client/src/shared', import.meta.url)) },
      { find: '@/entities', replacement: fileURLToPath(new URL('./client/src/entities', import.meta.url)) },
      { find: '@/features', replacement: fileURLToPath(new URL('./client/src/features', import.meta.url)) },
      { find: '@/widgets', replacement: fileURLToPath(new URL('./client/src/widgets', import.meta.url)) },
      { find: '@shared', replacement: fileURLToPath(new URL('./shared', import.meta.url)) },
      { find: '@', replacement: fileURLToPath(new URL('./client/src', import.meta.url)) },
    ],
  },
}));

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    configureServer(server) {
      const app = createServer();

      // Add Express app as middleware to Vite dev server
      server.middlewares.use(app);
    },
  };
}
