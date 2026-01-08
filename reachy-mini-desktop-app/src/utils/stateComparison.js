/**
 * Fast comparison functions for Zustand state updates
 * 
 * These functions are optimized to replace JSON.stringify for frequent comparisons.
 * They provide much better performance for state synchronization.
 */

/**
 * Compare robotStateFull objects efficiently
 * Structure: { data: any, lastUpdate: number|null, error: string|null }
 * 
 * @param {object} prev - Previous state
 * @param {object} next - Next state
 * @returns {boolean} True if equal
 */
export function compareRobotStateFull(prev, next) {
  if (prev === next) return true;
  if (!prev || !next) return prev === next;
  
  // Compare timestamps first (fastest check)
  if (prev.lastUpdate !== next.lastUpdate) return false;
  
  // Compare error strings
  if (prev.error !== next.error) return false;
  
  // Compare data - if both are null/undefined, they're equal
  if (!prev.data && !next.data) return true;
  if (!prev.data || !next.data) return false;
  
  // For data, do a shallow comparison of keys (most data is nested objects)
  // This is much faster than deep serialization
  const prevKeys = Object.keys(prev.data);
  const nextKeys = Object.keys(next.data);
  if (prevKeys.length !== nextKeys.length) return false;
  
  // Quick check: if keys match, assume equal (data structure is usually stable)
  // For exact comparison, we'd need to recurse, but this is a good balance
  return prevKeys.every(key => prev.data[key] === next.data[key]);
}

/**
 * Compare arrays of strings (activeMoves: string[])
 * Much faster than JSON.stringify for simple string arrays
 * 
 * @param {Array<string>} prev - Previous array
 * @param {Array<string>} next - Next array
 * @returns {boolean} True if equal
 */
export function compareStringArray(prev, next) {
  if (prev === next) return true;
  if (!prev || !next) return prev === next;
  if (prev.length !== next.length) return false;
  
  // For small arrays, direct comparison is fastest
  for (let i = 0; i < prev.length; i++) {
    if (prev[i] !== next[i]) return false;
  }
  return true;
}

/**
 * Compare frontendLogs arrays
 * Structure: Array<{ timestamp: string, message: string, source: string }>
 * 
 * @param {Array} prev - Previous logs array
 * @param {Array} next - Next logs array
 * @returns {boolean} True if equal
 */
export function compareFrontendLogs(prev, next) {
  if (prev === next) return true;
  if (!prev || !next) return prev === next;
  if (prev.length !== next.length) return false;
  
  // Compare last log entry first (most likely to change)
  if (prev.length > 0 && next.length > 0) {
    const lastPrev = prev[prev.length - 1];
    const lastNext = next[next.length - 1];
    if (lastPrev.timestamp !== lastNext.timestamp || 
        lastPrev.message !== lastNext.message ||
        lastPrev.source !== lastNext.source) {
      return false;
    }
  }
  
  // If last entry matches and length is same, assume equal
  // (logs are append-only, so if last entry and length match, arrays are equal)
  return true;
}

/**
 * Deep equality comparison for objects
 * Used for other object types that need deep comparison
 * 
 * @param {any} a - First value
 * @param {any} b - Second value
 * @returns {boolean} True if equal
 */
export function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  
  // For arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, idx) => deepEqual(val, b[idx]));
  }
  
  // For objects
  if (Array.isArray(a) || Array.isArray(b)) return false;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key => deepEqual(a[key], b[key]));
}

/**
 * Compare state values and extract changed keys
 * Uses fast comparison functions instead of JSON.stringify
 * 
 * @param {object} prevState - Previous state
 * @param {object} newState - New state
 * @param {Array<string>} relevantKeys - Keys to compare
 * @returns {object} Object with only changed keys
 */
export function extractChangedUpdates(prevState, newState, relevantKeys) {
  const changedUpdates = {};
  
  // Guard against undefined state (can happen during initialization)
  if (!prevState || !newState) {
    return changedUpdates;
  }
  
  relevantKeys.forEach(key => {
    const prevValue = prevState[key];
    const newValue = newState[key];
    
    // Fast path: reference equality
    if (prevValue === newValue) return;
    
    // Specialized comparisons for frequently updated objects
    if (key === 'robotStateFull') {
      if (!compareRobotStateFull(prevValue, newValue)) {
        changedUpdates[key] = newValue;
      }
    } else if (key === 'activeMoves') {
      if (!compareStringArray(prevValue, newValue)) {
        changedUpdates[key] = newValue;
      }
    } else if (key === 'frontendLogs') {
      if (!compareFrontendLogs(prevValue, newValue)) {
        changedUpdates[key] = newValue;
      }
    } else if (typeof prevValue === 'object' && typeof newValue === 'object' && prevValue !== null && newValue !== null) {
      // For other objects, use deep comparison
      if (!deepEqual(prevValue, newValue)) {
        changedUpdates[key] = newValue;
      }
    } else {
      // For primitives, simple comparison
      if (prevValue !== newValue) {
        changedUpdates[key] = newValue;
      }
    }
  });
  
  return changedUpdates;
}

