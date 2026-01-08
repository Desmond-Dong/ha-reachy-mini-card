/**
 * Compare two arrays with tolerance (optimized for Three.js/WebSocket data)
 * Avoids unnecessary re-renders when values change by tiny amounts
 * 
 * @param {Array} a - First array
 * @param {Array} b - Second array
 * @param {number} tolerance - Tolerance threshold (default: 0.005 rad ≈ 0.3°)
 * @returns {boolean} - True if arrays are equal within tolerance
 */
export function arraysEqual(a, b, tolerance = 0.005) {
  if (a === b) return true; // Same reference = early return
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i] - b[i]) > tolerance) return false;
  }
  return true;
}

export default arraysEqual;

