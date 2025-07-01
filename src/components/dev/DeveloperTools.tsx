import React from 'react';
import PerformanceDashboard from './PerformanceDashboard';
import DebugPanel from './DebugPanel';

/**
 * Developer Tools Container
 * Combines all development utilities in a single component
 * Only renders in development mode
 */
const DeveloperTools: React.FC = () => {
  // Only render in development
  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <>
      <PerformanceDashboard />
      <DebugPanel />
    </>
  );
};

export default DeveloperTools;