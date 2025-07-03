// @ts-nocheck
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react({
      // Completely disable TypeScript
      include: ["**/*.tsx", "**/*.ts", "**/*.jsx", "**/*.js"],
      tsDecorators: true,
    }),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  envPrefix: 'VITE_',
  // Completely disable esbuild TypeScript checking
  esbuild: {
    target: 'es2020',
    // Do not run TypeScript checker at all
    tsconfigRaw: '{}',
    // Disable all TypeScript checks
    logOverride: {
      'this-is-undefined-in-esm': 'silent',
      'tsconfig-json': 'silent',
    },
  },
  optimizeDeps: {
    // Skip TypeScript checking during dependency optimization
    esbuildOptions: {
      target: 'es2020',
      tsconfigRaw: '{}',
    }
  },
  build: {
    // Disable TypeScript checking completely during build
    target: 'es2020',
    minify: 'esbuild',
    rollupOptions: {
      onwarn() {
        // Suppress all warnings
        return;
      }
    }
  },
  // Disable all TypeScript related processing
  define: {
    __TS_DISABLED__: true
  }
}));