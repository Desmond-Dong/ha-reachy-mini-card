/**
 * Platform detection utilities for cross-platform compatibility
 */

let cachedPlatform = null;

/**
 * Get the current operating system platform
 * Detects platform from user agent and Tauri metadata
 * @returns {'macos' | 'windows' | 'linux' | 'unknown'} The platform name
 */
export function getPlatform() {
  if (cachedPlatform) {
    return cachedPlatform;
  }

  // Detect from user agent
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('mac')) {
    cachedPlatform = 'macos';
  } else if (userAgent.includes('win')) {
    cachedPlatform = 'windows';
  } else if (userAgent.includes('linux')) {
    cachedPlatform = 'linux';
  } else {
    cachedPlatform = 'unknown';
  }

  return cachedPlatform;
}

/**
 * Check if the current platform is macOS
 * @returns {boolean} True if macOS
 */
export function isMacOS() {
  const platform = getPlatform();
  return platform === 'macos';
}

/**
 * Check if the current platform is Windows
 * @returns {boolean} True if Windows
 */
export function isWindows() {
  const platform = getPlatform();
  return platform === 'windows';
}

/**
 * Check if the current platform is Linux
 * @returns {boolean} True if Linux
 */
export function isLinux() {
  const platform = getPlatform();
  return platform === 'linux';
}
