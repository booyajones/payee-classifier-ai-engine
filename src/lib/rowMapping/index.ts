
// Main exports for row mapping functionality
export * from './types';
export * from './asyncMappingCreator';
export * from './syncMappingCreator';
export * from './validationUtils';

// New modular exports
export {
  mapResultsToOriginalRows,
  mapResultsToOriginalRowsAsync
} from './mapper';

export { createMappedRow } from './rowCreator';
export { validateMappedResults } from './validator';

// Legacy exports for backward compatibility
export { 
  createPayeeRowMapping
} from './syncMappingCreator';

export {
  createPayeeRowMappingAsync
} from './asyncMappingCreator';
