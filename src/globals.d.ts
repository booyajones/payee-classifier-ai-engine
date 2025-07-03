// Global declarations for commonly used utilities
import type { ProductionLogger } from '@/lib/logging/productionLogger';

declare global {
  var productionLogger: ProductionLogger;
}

export {};