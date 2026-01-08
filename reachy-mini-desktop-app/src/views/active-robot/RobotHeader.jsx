import React from 'react';
import { Box, Typography } from '@mui/material';
import useAppStore from '../../store/useAppStore';

/**
 * Robot header with title, version and metadata
 * Apple style: minimalist, clean, spacious
 */
export default function RobotHeader({ daemonVersion, darkMode = false }) {
  const { connectionMode } = useAppStore();

  // Get connection type label
  const getConnectionLabel = () => {
    if (connectionMode === 'wifi') return 'WiFi';
    if (connectionMode === 'simulation') return 'Sim';
    return 'USB';
  };

  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        py: 1,
        mb: 1.5,
      }}
    >
      {/* Title with connection badge */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: -0.5 }}>
        <Typography
          sx={{
            fontSize: 20,
            fontWeight: 600,
            color: darkMode ? '#f5f5f5' : '#1d1d1f',
            letterSpacing: '-0.4px',
          }}
        >
          Reachy Mini
        </Typography>
        {connectionMode && (
          <Typography
            component="span"
            sx={{
              fontSize: 10,
              fontWeight: 600,
              color: darkMode ? '#666' : '#999',
              bgcolor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
              px: 0.75,
              py: 0.25,
              borderRadius: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {getConnectionLabel()}
          </Typography>
        )}
      </Box>
      
      {/* Version Subtitle */}
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 500,
          color: darkMode ? '#888' : '#86868b',
          fontFamily: 'SF Mono, Monaco, Menlo, monospace',
          mb: 0.75,
        }}
      >
        {daemonVersion ? `Daemon v${daemonVersion}` : 'Daemon unknown version'}
      </Typography>
    </Box>
  );
}

