import { useCallback, useRef, useEffect } from 'react';
import { ROBOT_POSITION_RANGES } from '../../../../utils/inputConstants';
import { clamp } from '../../../../utils/inputHelpers';
import { useActiveRobotContext } from '../../context';

// Enable/disable right antenna mirroring (inversion)
// When true: right antenna value is negated for symmetric movement
// When false: right antenna value is sent as-is
const ENABLE_RIGHT_ANTENNA_MIRRORING = false;

/**
 * Transform antennas for API: optionally invert right antenna for mirror behavior
 * Left antenna: sent as-is
 * Right antenna: inverted (negated) if ENABLE_RIGHT_ANTENNA_MIRRORING is true
 * 
 * @param {Array} antennas - [left, right] antenna values
 * @returns {Array} - [left, right] or [left, -right] depending on config
 */
function transformAntennasForAPI(antennas) {
  if (!antennas || antennas.length !== 2) return antennas;
  return ENABLE_RIGHT_ANTENNA_MIRRORING 
    ? [antennas[0], -antennas[1]] 
    : antennas;
}

/**
 * Hook for managing robot API calls
 * Handles continuous updates via requestAnimationFrame
 * 
 * Uses ActiveRobotContext for decoupling from global stores
 */
export function useRobotAPI(isActive, robotState, isDraggingRef) {
  const { api } = useActiveRobotContext();
  const { buildApiUrl, fetchWithTimeout, config: DAEMON_CONFIG } = api;
  const rafRef = useRef(null);
  const pendingPoseRef = useRef(null);
  const lastSentPoseRef = useRef(null);
  // AbortController to cancel previous requests when sending a new one
  const abortControllerRef = useRef(null);

  // Stop continuous updates
  const stopContinuousUpdates = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingPoseRef.current = null;
    // Cancel any pending request when stopping
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Continuous update loop
  const startContinuousUpdates = useCallback(() => {
    if (rafRef.current) return;
    
    const updateLoop = () => {
      if (pendingPoseRef.current && isDraggingRef.current) {
        const { headPose, antennas, bodyYaw } = pendingPoseRef.current;
        // Include antennas in poseKey to detect changes properly
        const poseKey = JSON.stringify({ headPose, antennas, bodyYaw });
        
        if (lastSentPoseRef.current !== poseKey) {
          const validBodyYaw = typeof bodyYaw === 'number' ? bodyYaw : 0;
          
          // ✅ If only body_yaw is changing, send body_yaw with current values for others
          // The API needs the current state to properly calculate body yaw movement
          if (headPose === null && antennas === null) {
            // Send current values so API can preserve them and calculate body yaw correctly
            const requestBody = {
              target_body_yaw: validBodyYaw,
              target_head_pose: robotState.headPose, // Send current head pose
              target_antennas: transformAntennasForAPI(robotState.antennas || [0, 0]), // Send current antennas (right inverted)
            };
            fetchWithTimeout(
              buildApiUrl('/api/move/set_target'),
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
              },
              DAEMON_CONFIG.MOVEMENT.CONTINUOUS_MOVE_TIMEOUT,
              { label: 'Continuous move (body_yaw)', silent: true, fireAndForget: true }
            ).catch((error) => {
              console.error('❌ set_target (body_yaw only) error:', error);
            });
          } else {
            // Normal case: send everything
            const requestBody = {
              target_head_pose: headPose,
              target_antennas: transformAntennasForAPI(antennas),
              target_body_yaw: validBodyYaw,
            };
            fetchWithTimeout(
              buildApiUrl('/api/move/set_target'),
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
              },
              DAEMON_CONFIG.MOVEMENT.CONTINUOUS_MOVE_TIMEOUT,
              { label: 'Continuous move', silent: true, fireAndForget: true }
            ).catch((error) => {
              console.error('❌ set_target error:', error);
            });
          }
          
          lastSentPoseRef.current = poseKey;
        }
        // Keep pendingPoseRef.current during drag - it will be updated by sendCommand calls
        // Only clear it when drag ends (handled by stopContinuousUpdates)
      }
      
      // Continue loop if still dragging
      if (isDraggingRef.current) {
        rafRef.current = requestAnimationFrame(updateLoop);
      } else {
        rafRef.current = null;
        stopContinuousUpdates();
      }
    };
    
    rafRef.current = requestAnimationFrame(updateLoop);
  }, [robotState, stopContinuousUpdates, isDraggingRef]);

  // Send command using set_target (called by smoothing loop)
  // This is now called directly by the smoothing loop, so we just send immediately
  // No need for startContinuousUpdates - the smoothing loop handles continuous updates
  // Add throttling to avoid sending too frequently
  // WiFi needs more time between requests than localhost
  const lastSendTimeRef = useRef(0);
  const SEND_THROTTLE_MS = 50; // ~20fps - works for both USB and WiFi
  
  const sendCommand = useCallback((headPose, antennas, bodyYaw) => {
    if (!isActive) return;
    const validBodyYaw = typeof bodyYaw === 'number' ? bodyYaw : (robotState.bodyYaw || 0);

    // Throttle sends to avoid overwhelming the API
    const now = Date.now();
    if (now - lastSendTimeRef.current < SEND_THROTTLE_MS) {
      return; // Skip this frame, will send on next frame
    }
    lastSendTimeRef.current = now;

    // Fire and forget - don't abort previous requests
    // The server handles the latest position, throttle prevents accumulation
    const requestBody = {
      target_head_pose: headPose,
      target_antennas: transformAntennasForAPI(antennas),
      target_body_yaw: validBodyYaw,
    };
    
    fetchWithTimeout(
      buildApiUrl('/api/move/set_target'),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      },
      DAEMON_CONFIG.MOVEMENT.CONTINUOUS_MOVE_TIMEOUT,
      { label: 'Set target (smoothed)', silent: true, fireAndForget: true }
    ).catch((error) => {
      console.error('❌ set_target error:', error);
    });
  }, [isActive, robotState.bodyYaw]);

  // Send single API call (for non-continuous updates like reset)
  const sendSingleCommand = useCallback((headPose, antennas, bodyYaw) => {
    if (!isActive) return;
    const validBodyYaw = typeof bodyYaw === 'number' ? bodyYaw : (robotState.bodyYaw || 0);
    
    const requestBody = {
      target_head_pose: headPose ? {
        x: clamp(headPose.x, ROBOT_POSITION_RANGES.POSITION.min, ROBOT_POSITION_RANGES.POSITION.max),
        y: clamp(headPose.y, ROBOT_POSITION_RANGES.POSITION.min, ROBOT_POSITION_RANGES.POSITION.max),
        z: clamp(headPose.z, ROBOT_POSITION_RANGES.POSITION.min, ROBOT_POSITION_RANGES.POSITION.max),
        pitch: clamp(headPose.pitch, ROBOT_POSITION_RANGES.PITCH.min, ROBOT_POSITION_RANGES.PITCH.max),
        yaw: clamp(headPose.yaw, ROBOT_POSITION_RANGES.YAW.min, ROBOT_POSITION_RANGES.YAW.max),
        roll: clamp(headPose.roll, ROBOT_POSITION_RANGES.ROLL.min, ROBOT_POSITION_RANGES.ROLL.max),
      } : robotState.headPose,
      target_antennas: transformAntennasForAPI(antennas || robotState.antennas || [0, 0]),
      target_body_yaw: validBodyYaw,
    };

    return fetchWithTimeout(
      buildApiUrl('/api/move/set_target'),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      },
      DAEMON_CONFIG.MOVEMENT.CONTINUOUS_MOVE_TIMEOUT,
      { label: 'Set target', silent: true }
    ).catch((error) => {
      console.error('❌ set_target error:', error);
    });
  }, [isActive, robotState]);

  return {
    sendCommand,
    sendSingleCommand,
    startContinuousUpdates,
    stopContinuousUpdates,
    // Expose refs for backward compatibility
    rafRef,
    pendingPoseRef,
    lastSentPoseRef,
  };
}

