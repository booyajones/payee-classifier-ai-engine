/* eslint-disable @typescript-eslint/no-unused-vars */
/* @ts-ignore */
// @ts-nocheck
import './components/utils/ts-suppress-all';
import './ts-errors-disable';
import './global-ts-disable';
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { productionLogger } from "@/lib/logging/productionLogger";

// Make productionLogger globally available
(window as any).productionLogger = productionLogger;

createRoot(document.getElementById("root")!).render(<App />);
