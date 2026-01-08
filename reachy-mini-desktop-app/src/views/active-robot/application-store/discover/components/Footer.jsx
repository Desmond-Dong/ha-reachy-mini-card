import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import ReachyDetective from '@assets/reachy-detective.svg';

/**
 * Footer component for Discover Modal
 */
export default function Footer({
  darkMode,
  onOpenCreateTutorial,
}) {
  return (
    <Box
      sx={{
        width: '100%',
        mt: 4,
        pt: 0,
        pb: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2.5,
      }}
    >
      {/* Illustration */}
      <Box
        component="img"
        src={ReachyDetective}
        alt="Reachy Detective"
        sx={{
          width: 200,
          height: 'auto',
          opacity: darkMode ? 0.7 : 0.8,
        }}
      />
      
      <Typography
        sx={{
          fontSize: 18,
          fontWeight: 700,
          color: darkMode ? '#aaa' : '#666',
          textAlign: 'center',
        }}
      >
        Can't find what you're looking for?
      </Typography>
      <Button
        onClick={onOpenCreateTutorial}
        sx={{
          textTransform: 'none',
          fontSize: 14,
          fontWeight: 600,
          color: '#FF9500',
          border: '1px solid #FF9500',
          borderRadius: '10px',
          px: 3,
          py: 1,
          bgcolor: 'transparent',
          '&:hover': {
            bgcolor: darkMode ? 'rgba(255, 149, 0, 0.08)' : 'rgba(255, 149, 0, 0.05)',
            borderColor: '#FF9500',
          },
        }}
      >
        Create your own app →
      </Button>
    </Box>
  );
}
