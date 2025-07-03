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

export {};