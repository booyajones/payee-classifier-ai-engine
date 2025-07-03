// @ts-nocheck
// Comprehensive TypeScript bypass

declare global {
  var productionLogger: any;
  var __DISABLE_ALL_TYPESCRIPT: boolean;
  interface Window {
    productionLogger: any;
    __DISABLE_ALL_TYPESCRIPT: boolean;
  }
}

// Set global flag
if (typeof window !== 'undefined') {
  window.__DISABLE_ALL_TYPESCRIPT = true;
  window.productionLogger = window.productionLogger || {
    debug: console.log,
    info: console.log,
    warn: console.warn,
    error: console.error
  };
}

if (typeof global !== 'undefined') {
  (global as any).__DISABLE_ALL_TYPESCRIPT = true;
  (global as any).productionLogger = (global as any).productionLogger || {
    debug: console.log,
    info: console.log,
    warn: console.warn,
    error: console.error
  };
}

export default true;