import React, { useState } from 'react';
import { Collapse, CircularProgress } from '@mui/material';

const ROWS_VISIBLE = 3;

/**
 * Simple emoji grid - displays emojis in a responsive grid layout
 * Shows 3 rows by default, with animated "Show more" accordion
 */
export function EmojiGrid({
  items = [],
  title = '',
  onAction,
  darkMode = false,
  disabled = false,
  searchQuery = '',
  activeActionName = null,
  isExecuting = false,
}) {
  const [expanded, setExpanded] = useState(false);
  
  // Fixed 6 columns layout
  const COLUMNS = 6;
  
  // Check if an item matches the search query
  const matchesSearch = (item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    return (
      item.name?.toLowerCase().includes(query) ||
      item.label?.toLowerCase().includes(query)
    );
  };
  
  // Primary orange color with subtle tint
  const borderColor = darkMode ? 'rgba(255,149,0,0.25)' : 'rgba(255,149,0,0.3)';
  const bgColor = darkMode ? 'rgba(255,149,0,0.06)' : 'rgba(255,149,0,0.04)';
  const textColor = darkMode ? '#fff' : '#333';
  const mutedColor = darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';
  const hoverBorderColor = darkMode ? 'rgba(255,149,0,0.5)' : 'rgba(255,149,0,0.6)';
  const hoverBg = darkMode ? 'rgba(255,149,0,0.12)' : 'rgba(255,149,0,0.1)';
  const activeBg = darkMode ? 'rgba(255,149,0,0.25)' : 'rgba(255,149,0,0.2)';
  
  // Ghost style for non-matching items
  const ghostBorderColor = darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  const ghostBgColor = darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)';
  
  // Calculate how many items to show initially (3 rows of 5 columns)
  const itemsVisible = COLUMNS * ROWS_VISIBLE;
  const hasMore = items.length > itemsVisible;
  
  const visibleItems = items.slice(0, itemsVisible);
  const hiddenItems = items.slice(itemsVisible);
  
  // Flex layout constants
  const GAP = 12;
  const itemWidth = `calc((100% - ${GAP * (COLUMNS - 1)}px) / ${COLUMNS})`;
  
  const renderItem = (item, index) => {
    const isMatch = matchesSearch(item);
    const isGhosted = searchQuery.trim() && !isMatch;
    const isActiveItem = activeActionName === item.name;
    const showSpinner = isActiveItem && isExecuting;
    
    // Use ghost styles when item doesn't match search
    const itemBorderColor = isGhosted ? ghostBorderColor : borderColor;
    const itemBgColor = isGhosted ? ghostBgColor : bgColor;
    const itemOpacity = isGhosted ? 0.25 : (disabled ? 0.5 : 1);
    
    // Highlighted border for active item (executing or moving)
    const activeBorderColor = '#FF9500';
    const currentBorderColor = isActiveItem && disabled ? activeBorderColor : itemBorderColor;
    
    return (
      <button
        key={index}
        onClick={() => {
          if (!disabled && !isGhosted && onAction && item.originalAction) {
            onAction(item.originalAction);
          }
        }}
        disabled={disabled || isGhosted}
        title={item.label}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: itemWidth,
          aspectRatio: '1 / 1',
          border: `1px solid ${currentBorderColor}`,
          borderRadius: 12,
          background: itemBgColor,
          cursor: (disabled || isGhosted) ? 'default' : 'pointer',
          opacity: itemOpacity,
          transition: 'all 0.2s ease',
          filter: isGhosted ? 'grayscale(100%)' : 'none',
          position: 'relative',
          boxSizing: 'border-box',
        }}
        onMouseEnter={(e) => {
          if (!disabled && !isGhosted) {
            e.currentTarget.style.background = hoverBg;
            e.currentTarget.style.transform = 'scale(1.03)';
            e.currentTarget.style.borderColor = hoverBorderColor;
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(255,149,0,0.15)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = itemBgColor;
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.borderColor = currentBorderColor;
          e.currentTarget.style.boxShadow = 'none';
        }}
        onMouseDown={(e) => {
          if (!disabled && !isGhosted) {
            e.currentTarget.style.background = activeBg;
            e.currentTarget.style.transform = 'scale(0.97)';
            e.currentTarget.style.boxShadow = '0 1px 4px rgba(255,149,0,0.2)';
          }
        }}
        onMouseUp={(e) => {
          if (!disabled && !isGhosted) {
            e.currentTarget.style.background = hoverBg;
            e.currentTarget.style.transform = 'scale(1.03)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(255,149,0,0.15)';
          }
        }}
      >
        {showSpinner ? (
          <CircularProgress 
            size={20} 
            thickness={3}
            sx={{ 
              color: '#FF9500',
            }} 
          />
        ) : (
          <span style={{ fontSize: 24, lineHeight: 1 }}>
            {item.emoji}
          </span>
        )}
      </button>
    );
  };
  
  const gridStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: GAP,
    width: '100%',
    boxSizing: 'border-box',
  };
  
  return (
    <div style={{ width: '100%', marginBottom: 10 }}>
      {/* Section title with toggle button aligned right */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
        paddingLeft: 2,
        paddingRight: 2,
      }}>
        {title && (
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            color: mutedColor,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {title} <span style={{ fontWeight: 400, opacity: 0.7 }}>({items.length})</span>
          </div>
        )}
        
        {/* Toggle button - discrete, aligned right */}
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              border: 'none',
              borderRadius: 4,
              background: 'transparent',
              color: mutedColor,
              fontSize: 11,
              fontWeight: 400,
              cursor: 'pointer',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#FF9500';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = mutedColor;
            }}
          >
            {expanded ? 'Less' : `+${hiddenItems.length} more`}
            <span style={{ 
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
              display: 'inline-block',
              fontSize: 8,
            }}>
              ▼
            </span>
          </button>
        )}
      </div>
      
      {/* Always visible grid */}
      <div style={gridStyle}>
        {visibleItems.map(renderItem)}
      </div>
      
      {/* Animated accordion for hidden items */}
      {hasMore && (
        <Collapse in={expanded} timeout={300}>
          <div style={{ ...gridStyle, marginTop: GAP }}>
            {hiddenItems.map((item, idx) => renderItem(item, itemsVisible + idx))}
          </div>
        </Collapse>
      )}
    </div>
  );
}
