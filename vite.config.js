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
      include: "**/*.{jsx,js}",
      exclude: ["**/*.ts", "**/*.tsx"],
      jsxImportSource: "react"
    }),
    componentTagger()
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
  esbuild: false,
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
    include: ['react', 'react-dom'],
    esbuildOptions: {
      target: 'esnext',
      jsx: 'automatic',
      loader: 'jsx'
    }
  },
  logLevel: 'error'
});