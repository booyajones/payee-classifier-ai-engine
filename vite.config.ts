// @ts-nocheck
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
      typescript: false, // Disable TypeScript completely
    }),
    componentTagger(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    'process.env': {}
  },
  esbuild: false, // Disable esbuild TypeScript processing
  build: {
    rollupOptions: {
      onwarn: () => {}, // Suppress all warnings
      external: []
    },
    minify: false,
    sourcemap: false
  }
});