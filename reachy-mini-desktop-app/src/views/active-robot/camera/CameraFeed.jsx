import React from 'react';
import { Box, Typography } from '@mui/material';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';

/**
 * CameraFeed Component - Placeholder for future camera feature
 * Currently displays "Coming soon" message
 */
export default function CameraFeed({ isLarge = false }) {
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: isLarge ? '16px' : '12px',
        overflow: 'hidden',
        border: isLarge ? 'none' : '1px solid rgba(0, 0, 0, 0.08)',
        bgcolor: '#000000',
      }}
    >
      {/* Coming soon placeholder */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
        }}
      >
        <VideocamOutlinedIcon
          sx={{
            fontSize: isLarge ? 64 : 32,
            color: 'rgba(255, 255, 255, 0.3)',
          }}
        />
        <Typography
          sx={{
            fontSize: isLarge ? 12 : 9,
            color: 'rgba(255, 255, 255, 0.4)',
            fontFamily: 'SF Mono, Monaco, Menlo, monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Camera coming soon
        </Typography>
      </Box>
    </Box>
  );
}
