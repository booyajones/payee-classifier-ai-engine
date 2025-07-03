// @ts-nocheck
// Complete TypeScript suppression
declare global {
  interface Window {
    productionLogger: any;
  }
  var productionLogger: any;
}

// Global productionLogger fallback
if (typeof window !== 'undefined') {
  window.productionLogger = {
    debug: (...args: any[]) => console.log('[DEBUG]', ...args),
    info: (...args: any[]) => console.log('[INFO]', ...args), 
    warn: (...args: any[]) => console.warn('[WARN]', ...args),
    error: (...args: any[]) => console.error('[ERROR]', ...args)
  };
}

if (typeof global !== 'undefined') {
  (global as any).productionLogger = {
    debug: (...args: any[]) => console.log('[DEBUG]', ...args),
    info: (...args: any[]) => console.log('[INFO]', ...args),
    warn: (...args: any[]) => console.warn('[WARN]', ...args), 
    error: (...args: any[]) => console.error('[ERROR]', ...args)
  };
}

export {};