import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import useAppStore from '../store/useAppStore';

/**
 * Simple FPS Meter Component
 * Displays FPS counter above the Reachy status tag in 3D viewer
 * Should be rendered inside Viewer3D with position: absolute
 */
export function FPSMeter({ darkMode }) {
  const [fps, setFps] = useState(0);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const animationFrameId = useRef(null);

  useEffect(() => {
    const measureFPS = () => {
      frameCount.current += 1;
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTime.current;

      // Update FPS every second
      if (deltaTime >= 1000) {
        const currentFPS = Math.round((frameCount.current * 1000) / deltaTime);
        setFps(currentFPS);
        frameCount.current = 0;
        lastTime.current = currentTime;
      }

      animationFrameId.current = requestAnimationFrame(measureFPS);
    };

    animationFrameId.current = requestAnimationFrame(measureFPS);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  return (
    <Box
      sx={{
        px: 1.25,
        py: 0.75,
        borderRadius: '8px',
        bgcolor: darkMode ? 'rgba(26, 26, 26, 0.85)' : 'rgba(255, 255, 255, 0.85)',
        border: darkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(10px)',
        pointerEvents: 'none',
      }}
    >
      <Typography
        sx={{
          fontSize: 9,
          fontWeight: 500,
          color: darkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.5)',
          fontFamily: 'SF Mono, Monaco, Menlo, monospace',
          letterSpacing: '0.02em',
          lineHeight: 1,
        }}
      >
        {fps} FPS
      </Typography>
    </Box>
  );
}

// Default export - wrapper that gets darkMode from store (for backward compatibility)
export default function FPSMeterWrapper() {
  const { darkMode } = useAppStore();
  return <FPSMeter darkMode={darkMode} />;
}

