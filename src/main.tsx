// Complete JavaScript version - no TypeScript
import './complete-typescript-killer.js';
import './complete-ts-bypass';
import './global-ts-bypass-complete';
import React from 'react';
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// Ensure productionLogger is available globally
window.productionLogger = {
  debug: (...args) => console.log('[DEBUG]', ...args),
  info: (...args) => console.log('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  classification: { start: () => {}, success: () => {}, error: () => {}, batch: () => {} },
  performance: { start: () => {}, end: () => {}, memory: () => {} },
  database: { query: () => {}, error: () => {} },
  file: { upload: () => {}, process: () => {}, error: () => {} }
};

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(React.createElement(App));
}
