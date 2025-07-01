
import { DataStandardizationResult, StandardizationStats } from './types';

/**
 * Get standardization statistics for analysis
 */
export function getStandardizationStats(results: DataStandardizationResult[]): StandardizationStats {
  const totalProcessed = results.length;
  const changesDetected = results.filter(r => r.original !== r.normalized).length;
  
  const allSteps = results.flatMap(r => r.cleaningSteps);
  const averageStepsPerName = allSteps.length / totalProcessed;
  
  const stepCounts = allSteps.reduce((acc, step) => {
    acc[step] = (acc[step] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const mostCommonSteps = Object.entries(stepCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([step, count]) => ({ step, count }));
  
  return {
    totalProcessed,
    changesDetected,
    averageStepsPerName,
    mostCommonSteps
  };
}
