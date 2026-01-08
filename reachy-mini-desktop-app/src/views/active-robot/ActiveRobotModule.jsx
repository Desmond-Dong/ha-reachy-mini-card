/**
 * @fileoverview ActiveRobot Module Wrapper
 * Wraps ActiveRobotView with the context provider for dependency injection
 * 
 * This is the main entry point for using the ActiveRobot module.
 * It can receive either:
 * - contextConfig prop (from useActiveRobotAdapter) - for integration with main app
 * - Direct config object - for standalone usage or testing
 */

import React from 'react';
import { ActiveRobotProvider } from './context';
import ActiveRobotView from './ActiveRobotView';

/**
 * ActiveRobotModule - Main wrapper component
 * 
 * @param {Object} props
 * @param {import('./context/types').ActiveRobotContextConfig} props.contextConfig - Context configuration (from adapter)
 * @param {boolean} props.isActive - Robot is active
 * @param {boolean} props.isStarting - Robot is starting
 * @param {boolean} props.isStopping - Robot is stopping
 * @param {Function} props.stopDaemon - Stop daemon function
 * @param {Function} props.sendCommand - Send command function
 * @param {Function} props.playRecordedMove - Play recorded move function
 * @param {boolean} props.isCommandRunning - Command is running
 * @param {Array} props.logs - Log entries
 * @param {string} props.daemonVersion - Daemon version
 * @param {string} props.usbPortName - USB port name
 */
function ActiveRobotModule({
  contextConfig,
  isActive,
  isStarting,
  isStopping,
  stopDaemon,
  sendCommand,
  playRecordedMove,
  isCommandRunning,
  logs,
  daemonVersion,
  usbPortName,
}) {
  // If no contextConfig provided, throw error (should use adapter)
  if (!contextConfig) {
    throw new Error(
      'ActiveRobotModule requires contextConfig prop. ' +
      'Use useActiveRobotAdapter() to create the config.'
    );
  }

  return (
    <ActiveRobotProvider config={contextConfig}>
      <ActiveRobotView
        isActive={isActive}
        isStarting={isStarting}
        isStopping={isStopping}
        stopDaemon={stopDaemon}
        sendCommand={sendCommand}
        playRecordedMove={playRecordedMove}
        isCommandRunning={isCommandRunning}
        logs={logs}
        daemonVersion={daemonVersion}
        usbPortName={usbPortName}
      />
    </ActiveRobotProvider>
  );
}

export default ActiveRobotModule;

