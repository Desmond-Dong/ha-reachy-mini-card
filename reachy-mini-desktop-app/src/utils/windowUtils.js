import { getCurrentWindow } from '@tauri-apps/api/window';

/**
 * Get the current app window, with support for mock window in dev mode
 * @returns {Promise<Window>} The current window instance
 */
export function getAppWindow() {
  return window.mockGetCurrentWindow ? window.mockGetCurrentWindow() : getCurrentWindow();
}

