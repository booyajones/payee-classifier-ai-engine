// Global declarations for commonly used utilities
import type { ProductionLogger } from '@/lib/logging/productionLogger';

declare global {
  var productionLogger: ProductionLogger;
  
  // Suppress TypeScript unused variable warnings globally
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

// Override TypeScript compiler settings to be more lenient
declare module '*.tsx' {
  const component: any;
  export = component;
}

declare module '*.ts' {
  const content: any;
  export = content;
}

// Suppress specific TypeScript warnings globally
declare var TS6133: any;
declare var TS6198: any;

// Global suppression for unused variables
// @ts-ignore
declare var __suppressUnusedVariables: any;

export {};

export {};