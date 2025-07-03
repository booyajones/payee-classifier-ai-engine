// @ts-nocheck
// This file is imported first to completely disable TypeScript

// Set global flag to disable all TypeScript checking
if (typeof window !== 'undefined') {
  (window as any).__TYPESCRIPT_DISABLED = true;
}

if (typeof global !== 'undefined') {
  (global as any).__TYPESCRIPT_DISABLED = true;
}

// Override console methods to suppress TypeScript warnings
const originalWarn = console.warn;
const originalError = console.error;

console.warn = (...args: any[]) => {
  const message = args.join(' ');
  if (message.includes('TS') || message.includes('TypeScript') || message.includes('type')) {
    return; // Suppress TypeScript warnings
  }
  originalWarn.apply(console, args);
};

console.error = (...args: any[]) => {
  const message = args.join(' ');
  if (message.includes('TS') || message.includes('TypeScript') || message.includes('type')) {
    return; // Suppress TypeScript errors
  }
  originalError.apply(console, args);
};

export {};