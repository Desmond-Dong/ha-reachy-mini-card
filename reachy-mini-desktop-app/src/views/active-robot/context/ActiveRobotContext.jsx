/**
 * @fileoverview ActiveRobot Context for dependency injection
 * 
 * This context allows the ActiveRobot module to be completely decoupled from:
 * - Global Zustand stores (useAppStore)
 * - Tauri-specific APIs
 * - Direct config imports
 * 
 * All dependencies are injected via the adapter hook (useActiveRobotAdapter)
 */

import React, { createContext, useContext } from 'react';

/**
 * Context holding all dependencies for the ActiveRobot module
 * @type {React.Context<import('./types').ActiveRobotContextConfig|null>}
 */
const ActiveRobotContext = createContext(null);

/**
 * Provider component that wraps the ActiveRobot module
 * @param {Object} props
 * @param {import('./types').ActiveRobotContextConfig} props.config - Context configuration
 * @param {React.ReactNode} props.children - Child components
 */
export function ActiveRobotProvider({ config, children }) {
  return (
    <ActiveRobotContext.Provider value={config}>
      {children}
    </ActiveRobotContext.Provider>
  );
}

/**
 * Hook to access the ActiveRobot context
 * Throws an error if used outside of ActiveRobotProvider
 * @returns {import('./types').ActiveRobotContextConfig}
 */
export function useActiveRobotContext() {
  const context = useContext(ActiveRobotContext);
  
  if (context === null) {
    throw new Error(
      'useActiveRobotContext must be used within an ActiveRobotProvider. ' +
      'Make sure ActiveRobotModule is properly wrapped with a provider.'
    );
  }
  
  return context;
}

// Named exports
export { ActiveRobotContext };

// Default export for convenience
export default {
  ActiveRobotContext,
  ActiveRobotProvider,
  useActiveRobotContext,
};
