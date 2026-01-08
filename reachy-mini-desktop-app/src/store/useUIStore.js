/**
 * ✨ useUIStore - Proxy to useStore for backwards compatibility
 * 
 * This file now exports useStore directly.
 * Only 1 file imports this directly:
 * - src/store/useAppStore.js (now also a proxy)
 * 
 * The UI state is now part of the unified store with slices.
 * 
 * @deprecated Use `import { useStore } from '@store'` for new code
 */

import { useStore } from './useStore';

// Export useStore as useUIStore for backwards compatibility
export const useUIStore = useStore;

// Also export default for any default imports
export default useStore;
