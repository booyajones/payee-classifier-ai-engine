/**
 * @deprecated This file is maintained for backward compatibility.
 * Please import from '@/lib/rowMapping' instead.
 */

// Re-export everything from the new modular structure
export {
  mapResultsToOriginalRows,
  mapResultsToOriginalRowsAsync
} from './mapper';

export { createMappedRow } from './rowCreator';
export { validateMappedResults } from './validator';
