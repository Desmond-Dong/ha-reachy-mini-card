/**
 * WebApp - Simplified entry point for web-only mode
 * 
 * This component is used when the app is built for web (dashboard-v2)
 * and served by the daemon. It skips all Tauri-specific features
 * and goes directly to ActiveRobotView.
 * 
 * Assumes the daemon is already running and active.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import ActiveRobotModule from '../views/active-robot/ActiveRobotModule';
import { useWebActiveRobotAdapter } from '../hooks/useWebActiveRobotAdapter';
import useAppStore from '../store/useAppStore';

/**
 * Web-only App component
 * Directly renders ActiveRobotView without Tauri dependencies
 */
export default function WebApp() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [daemonVersion, setDaemonVersion] = useState('web');
  const darkMode = useAppStore(state => state.darkMode);
  const isActive = useAppStore(state => state.isActive);
  const isCommandRunning = useAppStore(state => state.isCommandRunning);
  const logs = useAppStore(state => state.logs);
  
  // Get adapter config for ActiveRobotModule
  const contextConfig = useWebActiveRobotAdapter();
  
  // No-op functions for web mode
  const stopDaemon = useCallback(() => {
    console.log('[WebMode] stopDaemon - not available');
  }, []);
  
  const sendCommand = useCallback(async (command) => {
    console.log('[WebMode] sendCommand:', command);
    // Could implement via REST API if needed
  }, []);
  
  const playRecordedMove = useCallback(async (moveName) => {
    console.log('[WebMode] playRecordedMove:', moveName);
    // Could implement via REST API if needed
  }, []);
  
  // Check daemon connection on mount
  useEffect(() => {
    const checkDaemon = async () => {
      try {
        const response = await fetch('/api/daemon/status');
        if (response.ok) {
          const data = await response.json();
          // Accept 'running' or 'error' state (error = backend issue but server running)
          if (data.state === 'running' || data.state === 'error') {
            setIsConnected(true);
            setDaemonVersion(data.version || 'web');
            // Update store with daemon state
            useAppStore.getState().update({
              isActive: data.state === 'running',
              robotStatus: data.state === 'running' ? 'ready' : 'error',
            });
          } else {
            setError(`Daemon is ${data.state}. Please start the daemon first.`);
          }
        } else {
          setError('Failed to connect to daemon API');
        }
      } catch (err) {
        setError(`Cannot connect to daemon: ${err.message}`);
      }
    };
    
    checkDaemon();
    
    // Poll daemon status
    const interval = setInterval(checkDaemon, 5000);
    return () => clearInterval(interval);
  }, []);
  
  // Loading state
  if (!isConnected && !error) {
    return (
      <Box
        sx={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          bgcolor: darkMode ? '#1a1a1a' : '#f5f5f7',
        }}
      >
        <CircularProgress sx={{ color: '#FF9500' }} />
        <Typography sx={{ color: darkMode ? '#888' : '#666' }}>
          Connecting to daemon...
        </Typography>
      </Box>
    );
  }
  
  // Error state
  if (error) {
    return (
      <Box
        sx={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          bgcolor: darkMode ? '#1a1a1a' : '#f5f5f7',
        }}
      >
        <Typography variant="h5" sx={{ color: '#ef4444' }}>
          Connection Error
        </Typography>
        <Typography sx={{ color: darkMode ? '#888' : '#666', textAlign: 'center', maxWidth: 400 }}>
          {error}
        </Typography>
        <Typography sx={{ color: darkMode ? '#666' : '#999', fontSize: 12, mt: 2 }}>
          Make sure the daemon is running on port 8000
        </Typography>
      </Box>
    );
  }
  
  // Connected - render ActiveRobotModule in a centered container
  // Size matches Tauri app expanded mode: 900x670
  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: darkMode ? '#0a0a0a' : '#e5e5e7',
      }}
    >
      <Box
        sx={{
          width: 900,
          height: 670,
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: darkMode 
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.1)' 
            : '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.05)',
        }}
      >
        <ActiveRobotModule
          contextConfig={contextConfig}
          isActive={isActive}
          isStarting={false}
          isStopping={false}
          stopDaemon={stopDaemon}
          sendCommand={sendCommand}
          playRecordedMove={playRecordedMove}
          isCommandRunning={isCommandRunning}
          logs={logs}
          daemonVersion={daemonVersion}
          usbPortName="web"
        />
      </Box>
    </Box>
  );
}

