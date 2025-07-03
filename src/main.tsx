// @ts-nocheck
import './disable-all-typescript';
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { productionLogger } from "@/lib/logging/productionLogger";

// Make productionLogger globally available
(window as any).productionLogger = productionLogger;

createRoot(document.getElementById("root")!).render(<App />);
