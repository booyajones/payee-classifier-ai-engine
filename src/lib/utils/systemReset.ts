/**
 * System reset utilities for clearing all application state
 */

export const clearLocalStorage = () => {
  try {
    // Clear all batch job related localStorage
    const keys = Object.keys(localStorage);
    const batchKeys = keys.filter(key => 
      key.includes('batch') || 
      key.includes('job') || 
      key.includes('payee') ||
      key.includes('upload')
    );
    
    batchKeys.forEach(key => {
      localStorage.removeItem(key);
      console.log(`[RESET] Cleared localStorage key: ${key}`);
    });
    
    console.log(`[RESET] Cleared ${batchKeys.length} localStorage items`);
  } catch (error) {
    console.error('[RESET] Error clearing localStorage:', error);
  }
};

export const clearSessionStorage = () => {
  try {
    // Clear all batch job related sessionStorage
    const keys = Object.keys(sessionStorage);
    const batchKeys = keys.filter(key => 
      key.includes('batch') || 
      key.includes('job') || 
      key.includes('payee') ||
      key.includes('upload')
    );
    
    batchKeys.forEach(key => {
      sessionStorage.removeItem(key);
      console.log(`[RESET] Cleared sessionStorage key: ${key}`);
    });
    
    console.log(`[RESET] Cleared ${batchKeys.length} sessionStorage items`);
  } catch (error) {
    console.error('[RESET] Error clearing sessionStorage:', error);
  }
};

export const resetAllApplicationState = () => {
  console.log('[RESET] Starting complete application state reset...');
  
  // Clear browser storage
  clearLocalStorage();
  clearSessionStorage();
  
  // Clear any global variables
  if (typeof window !== 'undefined') {
    (window as any).__BATCH_JOBS_CACHE = undefined;
    (window as any).__PAYEE_DATA_CACHE = undefined;
    (window as any).__UPLOAD_STATE_CACHE = undefined;
  }
  
  console.log('[RESET] Complete application state reset finished');
};