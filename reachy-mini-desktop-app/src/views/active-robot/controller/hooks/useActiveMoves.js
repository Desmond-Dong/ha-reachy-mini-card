import { useCallback } from 'react';
import { useActiveRobotContext } from '../../context';

/**
 * Hook to monitor and manage active robot moves
 * ✅ Now reads from context (no polling - handled by useRobotState)
 * Provides stop functions for active moves
 * 
 * Uses ActiveRobotContext for decoupling from global stores
 */
export function useActiveMoves(isActive) {
  const { robotState, api } = useActiveRobotContext();
  const { buildApiUrl, fetchWithTimeout, config: DAEMON_CONFIG } = api;
  
  // ✅ Read from context (polled by useRobotState)
  const activeMoves = robotState.activeMoves || [];

  // Stop a specific move by UUID
  const stopMove = useCallback(async (moveUuid) => {
    if (!isActive || !moveUuid) return;

    try {
      await fetchWithTimeout(
        buildApiUrl('/api/move/stop'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uuid: moveUuid }),
        },
        DAEMON_CONFIG.TIMEOUTS.COMMAND,
        { label: 'Stop move', silent: false }
      );

      // Refresh active moves after stopping (will be updated by next poll from useRobotState)
      // No need to manually fetch - useRobotState will update the store
    } catch (error) {
      console.error('❌ Failed to stop move:', error);
    }
  }, [isActive]);

  // Stop all active moves
  const stopAllMoves = useCallback(async () => {
    if (!isActive || activeMoves.length === 0) return;

    await Promise.all(
      activeMoves.map(move => stopMove(move.uuid))
    );
  }, [isActive, activeMoves, stopMove]);

  return {
    activeMoves,
    isLoading: false, // No loading state needed (synchronous read from store)
    stopMove,
    stopAllMoves,
    refreshActiveMoves: () => {}, // No-op (handled by useRobotState)
  };
}

