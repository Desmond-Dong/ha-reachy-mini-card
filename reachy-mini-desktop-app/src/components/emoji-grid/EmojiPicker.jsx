import React, { useMemo } from 'react';
import { EmojiGrid } from './EmojiGrid';
import { EMOTION_EMOJIS, DANCE_EMOJIS } from '@constants/choreographies';

// Emotions featured in the wheel - shown first in the library
const WHEEL_EMOTIONS = [
  'loving1',
  'grateful1',
  'helpful1',
  'surprised1',
  'thoughtful1',
  'yes1',
  'no1',
  'boredom2',
  'anxiety1',
  'downcast1',
  'sad1',
  'sad2',
  'dying1',
  'reprimand1',
];

/**
 * Emoji picker with two grids - Emotions and Dances
 * Simple grid layout, 3 rows visible with animated "show more" accordion
 */
export function EmojiPicker({
  emotions = [],
  dances = [],
  onAction,
  darkMode = false,
  disabled = false,
  searchQuery = '',
  activeActionName = null,
  isExecuting = false,
}) {
  // Prepare emotion items with emojis from constants
  // Sort to show wheel emotions first
  const emotionItems = useMemo(() => {
    const wheelSet = new Set(WHEEL_EMOTIONS);
    
    // Separate wheel emotions from others
    const wheelEmotions = [];
    const otherEmotions = [];
    
    emotions.forEach(item => {
      const name = typeof item === 'string' ? item : item.name;
      const emotionItem = {
        name,
        emoji: EMOTION_EMOJIS[name] || '😐',
        label: name.replace(/[0-9]+$/, '').replace(/_/g, ' '),
        originalAction: {
          name,
          type: 'emotion',
          label: name.replace(/[0-9]+$/, '').replace(/_/g, ' '),
        },
      };
      
      if (wheelSet.has(name)) {
        wheelEmotions.push(emotionItem);
      } else {
        otherEmotions.push(emotionItem);
      }
    });
    
    // Sort wheel emotions to match wheel order
    wheelEmotions.sort((a, b) => {
      return WHEEL_EMOTIONS.indexOf(a.name) - WHEEL_EMOTIONS.indexOf(b.name);
    });
    
    return [...wheelEmotions, ...otherEmotions];
  }, [emotions]);
  
  // Prepare dance items with emojis from constants
  const danceItems = useMemo(() => {
    return dances.map(item => {
      const name = typeof item === 'string' ? item : item.name;
      
      return {
        name,
        emoji: DANCE_EMOJIS[name] || '🎵',
        label: name.replace(/_/g, ' '),
        originalAction: {
          name,
          type: 'dance',
          label: name.replace(/_/g, ' '),
        },
      };
    });
  }, [dances]);
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 28,
      width: '100%',
    }}>
      {/* Emotions grid */}
      {emotionItems.length > 0 && (
        <EmojiGrid
          items={emotionItems}
          title="Emotions"
          onAction={onAction}
          darkMode={darkMode}
          disabled={disabled}
          searchQuery={searchQuery}
          activeActionName={activeActionName}
          isExecuting={isExecuting}
        />
      )}
      
      {/* Dances grid */}
      {danceItems.length > 0 && (
        <EmojiGrid
          items={danceItems}
          title="Dances"
          onAction={onAction}
          darkMode={darkMode}
          disabled={disabled}
          searchQuery={searchQuery}
          activeActionName={activeActionName}
          isExecuting={isExecuting}
        />
      )}
    </div>
  );
}
