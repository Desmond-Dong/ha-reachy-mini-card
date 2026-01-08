/**
 * ✨ useLogsStore - Proxy to useStore for backwards compatibility
 * 
 * This file now exports useStore directly.
 * Only 3 files import this directly:
 * - src/store/useAppStore.js (now also a proxy)
 * - src/utils/logging/logger.js
 * - src/utils/logging/useLogger.js
 * 
 * The logs state is now part of the unified store with slices.
 * 
 * @deprecated Use `import { useStore } from '@store'` for new code
 */

import { useStore } from './useStore';

// Export useStore as useLogsStore for backwards compatibility
export const useLogsStore = useStore;

// Also export default for any default imports
export default useStore;
