import { useEffect, useRef, useCallback } from 'react';

/**
 * CENTRALIZED TIMER MANAGEMENT
 * Ensures all timers are properly cleaned up to prevent memory leaks
 */
export const useTimerManager = () => {
  const timers = useRef<Set<NodeJS.Timeout>>(new Set());
  const intervals = useRef<Set<NodeJS.Timeout>>(new Set());

  // SAFE TIMER CREATION
  const createTimer = useCallback((callback: () => void, delay: number): NodeJS.Timeout => {
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      callback();
    }, delay);
    
    timers.current.add(timer);
    return timer;
  }, []);

  // SAFE INTERVAL CREATION
  const createInterval = useCallback((callback: () => void, delay: number): NodeJS.Timeout => {
    const interval = setInterval(callback, delay);
    intervals.current.add(interval);
    return interval;
  }, []);

  // CLEANUP SPECIFIC TIMER
  const clearTimer = useCallback((timer: NodeJS.Timeout) => {
    clearTimeout(timer);
    timers.current.delete(timer);
  }, []);

  // CLEANUP SPECIFIC INTERVAL
  const clearInterval = useCallback((interval: NodeJS.Timeout) => {
    clearInterval(interval);
    intervals.current.delete(interval);
  }, []);

  // EMERGENCY CLEANUP ALL
  const clearAll = useCallback(() => {
    console.log(`[TIMER MANAGER] Cleaning up ${timers.current.size} timers and ${intervals.current.size} intervals`);
    
    // Clear all timers
    timers.current.forEach(timer => {
      clearTimeout(timer);
    });
    timers.current.clear();
    
    // Clear all intervals
    intervals.current.forEach(interval => {
      clearInterval(interval);
    });
    intervals.current.clear();
  }, []);

  // AUTOMATIC CLEANUP ON UNMOUNT
  useEffect(() => {
    return () => {
      clearAll();
    };
  }, [clearAll]);

  return {
    createTimer,
    createInterval,
    clearTimer,
    clearInterval: clearInterval,
    clearAll,
    activeTimers: timers.current.size,
    activeIntervals: intervals.current.size
  };
};