/**
 * ✨ useAppStore - Proxy to useStore for backwards compatibility
 * 
 * This file now exports useStore directly, maintaining the same API
 * that all 39+ files in the codebase expect.
 * 
 * The new architecture uses a single store with slices:
 * - robotSlice: Robot connection, status, state machine
 * - logsSlice: Daemon, frontend, app logs  
 * - uiSlice: Theme, windows, UI state
 * - appsSlice: Application data, installation
 * 
 * All actions and state are available through useStore.
 * This file exists only for backwards compatibility with existing imports.
 * 
 * @deprecated Use `import { useStore } from '@store'` for new code
 */

import { useStore } from './useStore';

// Re-export useStore as default for backwards compatibility
// All existing imports like `import useAppStore from '@store/useAppStore'` will work
export default useStore;

// Also export as named export for flexibility
export { useStore as useAppStore };
