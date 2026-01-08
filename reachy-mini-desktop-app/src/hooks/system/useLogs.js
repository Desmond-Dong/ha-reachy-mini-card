import { useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import useAppStore from '../../store/useAppStore';
import { useLogger } from '../../utils/logging';

export const useLogs = () => {
  const { logs, setLogs } = useAppStore();
  const logger = useLogger();

  const fetchLogs = useCallback(async () => {
    try {
      const fetchedLogs = await invoke('get_logs');
      setLogs(fetchedLogs);
    } catch (e) {
      console.error('Error fetching logs:', e);
    }
  }, [setLogs]);
  
  // Function to add a frontend log
  const logCommand = useCallback((message, type = 'info') => {
    // Timestamp is now automatically added by logger
    logger.info(message);
  }, [logger]);
  
  // Log an API action (request to daemon)
  const logApiAction = useCallback((action, details = '', success = true) => {
    // Timestamp is now automatically added by logger
    if (success) {
      logger.success(details ? `${action}: ${details}` : action);
    } else {
      logger.error(details ? `${action}: ${details}` : action);
    }
  }, [logger]);

  return {
    logs,
    fetchLogs,
    logCommand,
    logApiAction,
  };
};

