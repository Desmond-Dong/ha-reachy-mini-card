/**
 * 🎭 Simulation Mode Utility
 * 
 * Allows launching the application in simulation mode for development/testing without USB robot connected.
 * 
 * Usage:
 *   - In dev: SIM_MODE=true yarn tauri:dev
 *   - Via script: yarn tauri:dev:sim
 *   - Via localStorage: localStorage.setItem('simMode', 'true') then reload
 */

// Cache to avoid logging multiple times
let _simModeLogged = false;

/**
 * Detects if simulation mode is enabled
 * @returns {boolean} true if simulation mode is active
 */
export function isSimulationMode() {
  // 1. Check import.meta.env (Vite) - highest priority
  // Vite exposes environment variables prefixed with VITE_
  if (import.meta.env?.VITE_SIM_MODE === 'true' || import.meta.env?.VITE_SIM_MODE === true) {
    if (!_simModeLogged) {
      console.log('🎭 Simulation mode enabled (via VITE_SIM_MODE)');
      _simModeLogged = true;
    }
    return true;
  }
  
  // 2. Check localStorage (for quick development without restarting)
  // Useful to quickly enable/disable from console
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('simMode');
    if (stored === 'true') {
      if (!_simModeLogged) {
        console.log('🎭 Simulation mode enabled (via localStorage)');
        _simModeLogged = true;
      }
      return true;
    }
  }
  
  // 3. Check process.env (fallback for Node.js)
  if (typeof process !== 'undefined' && process.env?.SIM_MODE === 'true') {
    if (!_simModeLogged) {
      console.log('🎭 Simulation mode enabled (via SIM_MODE env)');
      _simModeLogged = true;
    }
    return true;
  }
  
  return false;
}

/**
 * Enables simulation mode (for development)
 */
export function enableSimulationMode() {
  if (typeof window !== 'undefined') {
    localStorage.setItem('simMode', 'true');
    _simModeLogged = false; // Reset to re-log on next check
    console.log('🎭 Simulation mode enabled (via enableSimulationMode())');
  }
}

/**
 * Disables simulation mode
 */
export function disableSimulationMode() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('simMode');
    _simModeLogged = false; // Reset to re-log on next check
    console.log('🎭 Simulation mode disabled');
  }
}

/**
 * Simulated USB port for simulation mode
 */
export const SIMULATED_USB_PORT = '/dev/tty.usbserial-SIMULATED';

