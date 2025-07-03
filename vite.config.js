import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Completely disable TypeScript processing
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react({
      include: "**/*.{jsx,tsx,js,ts}",
      exclude: [],
      jsxImportSource: "react",
      plugins: [],
      babel: {
        plugins: []
      }
    }),
    componentTagger(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    'process.env': {},
    'global': 'globalThis'
  },
  esbuild: {
    target: 'esnext',
    include: /\.(js|jsx|ts|tsx)$/,
    exclude: [],
    loader: 'tsx',
    jsx: 'automatic',
    tsconfigRaw: {
      compilerOptions: {
        useDefineForClassFields: false,
        jsx: "react-jsx",
        allowJs: true,
        skipLibCheck: true,
        noImplicitAny: false,
        strict: false,
        noUnusedLocals: false,
        noUnusedParameters: false,
        suppressImplicitAnyIndexErrors: true
      }
    }
  },
  build: {
    target: 'esnext',
    minify: false,
    sourcemap: false,
    rollupOptions: {
      onwarn: () => {},
      external: []
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
      jsx: 'automatic'
    }
  },
  logLevel: 'error'
});