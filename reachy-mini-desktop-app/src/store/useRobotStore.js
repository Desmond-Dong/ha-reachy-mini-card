/**
 * ✨ useRobotStore - Proxy to useStore for backwards compatibility
 * 
 * This file now exports useStore directly.
 * Only 2 files import this directly:
 * - src/config/daemon.js
 * - src/store/useAppStore.js (now also a proxy)
 * 
 * The robot state is now part of the unified store with slices.
 * 
 * @deprecated Use `import { useStore } from '@store'` for new code
 */

import { useStore } from './useStore';

// Export useStore as useRobotStore for backwards compatibility
export const useRobotStore = useStore;

// Also export default for any default imports
export default useStore;
