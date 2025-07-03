
// @ts-nocheck
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react({
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
  esbuild: {
    target: 'es2020',
    tsconfigRaw: JSON.stringify({
      compilerOptions: {
        allowJs: true,
        strict: false,
        noUnusedLocals: false,
        noUnusedParameters: false,
        noImplicitAny: false,
        skipLibCheck: true,
        checkJs: false
      }
    }),
    logOverride: {
      'this-is-undefined-in-esm': 'silent',
      'tsconfig-json': 'silent',
      'direct-eval': 'silent',
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020',
      tsconfigRaw: JSON.stringify({
        compilerOptions: {
          allowJs: true,
          strict: false,
          noUnusedLocals: false,
          noUnusedParameters: false,
          noImplicitAny: false,
          skipLibCheck: true,
          checkJs: false
        }
      }),
    }
  },
  build: {
    target: 'es2020',
    minify: 'esbuild',
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress all TypeScript related warnings
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT' || 
            warning.code === 'CIRCULAR_DEPENDENCY' ||
            warning.message?.includes('TS')) {
          return;
        }
        warn(warning);
      }
    }
  },
  define: {
    __TS_DISABLED__: true,
    'process.env.NODE_ENV': JSON.stringify(mode)
  }
}));
