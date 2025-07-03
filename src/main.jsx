import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// Global productionLogger
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

global.productionLogger = window.productionLogger;

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
}
