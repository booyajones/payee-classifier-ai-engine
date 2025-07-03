/**
 * Optimized state management hook that prevents unnecessary re-renders
 */
// @ts-nocheck
import { useState, useCallback, useRef } from 'react';

interface StateManager<T> {
  state: T;
  setState: (newState: T | ((prev: T) => T)) => void;
  updateField: <K extends keyof T>(field: K, value: T[K]) => void;
  resetState: () => void;
  hasChanged: () => boolean;
}

export function useOptimizedState<T>(initialState: T): StateManager<T> {
  const [state, setState] = useState<T>(initialState);
  const initialStateRef = useRef<T>(initialState);
  const lastStateRef = useRef<T>(initialState);

  const updateField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setState(prev => {
      if (prev[field] === value) return prev; // Prevent unnecessary updates
      return { ...prev, [field]: value };
    });
  }, []);

  const resetState = useCallback(() => {
    setState(initialStateRef.current);
  }, []);

  const hasChanged = useCallback(() => {
    return JSON.stringify(state) !== JSON.stringify(lastStateRef.current);
  }, [state]);

  const optimizedSetState = useCallback((newState: T | ((prev: T) => T)) => {
    setState(prev => {
      const result = typeof newState === 'function' ? (newState as (prev: T) => T)(prev) : newState;
      
      // Deep comparison to prevent unnecessary updates
      if (JSON.stringify(result) === JSON.stringify(prev)) {
        return prev;
      }
      
      lastStateRef.current = prev;
      return result;
    });
  }, []);

  return {
    state,
    setState: optimizedSetState,
    updateField,
    resetState,
    hasChanged
  };
}

/**
 * Debounced state hook to prevent rapid state updates
 */
export function useDebouncedState<T>(
  initialValue: T,
  delay: number = 300
): [T, (value: T) => void, T] {
  const [immediateValue, setImmediateValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const setValue = useCallback((value: T) => {
    setImmediateValue(value);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
  }, [delay]);

  return [debouncedValue, setValue, immediateValue];
}

/**
 * Throttled state hook to limit state update frequency
 */
export function useThrottledState<T>(
  initialValue: T,
  limit: number = 1000
): [T, (value: T) => void] {
  const [state, setState] = useState(initialValue);
  const lastUpdated = useRef(0);
  const pendingValue = useRef<T>();
  const timeoutRef = useRef<NodeJS.Timeout>();

  const setValue = useCallback((value: T) => {
    const now = Date.now();
    
    if (now - lastUpdated.current >= limit) {
      setState(value);
      lastUpdated.current = now;
    } else {
      pendingValue.current = value;
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        if (pendingValue.current !== undefined) {
          setState(pendingValue.current);
          lastUpdated.current = Date.now();
          pendingValue.current = undefined;
        }
      }, limit - (now - lastUpdated.current));
    }
  }, [limit]);

  return [state, setValue];
}
