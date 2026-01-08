/**
 * Development mode detection utility
 * Checks if the app is running in development mode
 */

/**
 * Detects if the app is running in development mode
 * @returns {boolean} true if in development mode
 */
export function isDevMode() {
  // Check Vite environment variable
  if (import.meta.env?.DEV || import.meta.env?.MODE === 'development') {
    return true;
  }
  
  // Check Tauri dev mode
  if (import.meta.env?.TAURI_DEBUG === 'true' || import.meta.env?.TAURI_DEBUG === true) {
    return true;
  }
  
  // Check if running in browser (not Tauri)
  if (typeof window !== 'undefined' && !window.__TAURI__) {
    return true;
  }
  
  return false;
}

