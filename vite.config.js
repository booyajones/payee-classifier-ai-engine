import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react({
      include: "**/*.{jsx,js}",
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
  esbuild: {
    include: /\.(js|jsx)$/,
    exclude: /\.(ts|tsx)$/,
    loader: 'jsx',
    jsx: 'automatic'
  },
  build: {
    target: 'esnext',
    sourcemap: false,
    rollupOptions: {
      onwarn: () => {}
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
        '.jsx': 'jsx'
      }
    }
  }
});