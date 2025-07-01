
/**
 * Comprehensive data standardization and normalization service
 * Ensures consistent data cleaning while preserving all original records
 */

// Export types
export * from './types';

// Export main functions
export { standardizePayeeName } from './nameStandardizer';
export { batchStandardizeNames, batchStandardizeNamesAsync } from './batchProcessor';
export { getStandardizationStats } from './statsCalculator';
