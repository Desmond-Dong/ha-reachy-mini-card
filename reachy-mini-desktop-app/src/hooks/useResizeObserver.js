import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Custom useResizeObserver hook - Best practices 2025
 * 
 * Uses ResizeObserver with entries to get dimensions directly
 * Avoids timing issues with flexbox and asynchronous layouts
 * Specifically handles Tauri window resizes which can be asynchronous
 * 
 * @param {React.RefObject} ref - Reference to the element to observe
 * @param {Object} options - Options for ResizeObserver
 * @param {string} options.box - Type of box to observe ('border-box', 'content-box', 'device-pixel-content-box')
 * @returns {Object} - { width, height } in pixels (0 if not available)
 */
export function useResizeObserver(ref, options = {}) {
  const { box = 'border-box' } = options;
  const [size, setSize] = useState({ width: 0, height: 0 });
  const observerRef = useRef(null);
  const rafRef = useRef(null);
  const isWindowResizingRef = useRef(false);

  // Callback to update size in an optimized way
  const updateSize = useCallback((entries) => {
    // Use requestAnimationFrame to synchronize with rendering
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      if (!entries || entries.length === 0) return;

      const entry = entries[0];
      
      // Use entry dimensions directly (more reliable than getBoundingClientRect)
      // borderBoxSize is preferred as it includes padding and border
      let width = 0;
      let height = 0;

      if (entry.borderBoxSize && entry.borderBoxSize.length > 0) {
        // Modern API with borderBoxSize (better precision)
        const borderBox = entry.borderBoxSize[0];
        width = borderBox.inlineSize;
        height = borderBox.blockSize;
      } else if (entry.contentBoxSize && entry.contentBoxSize.length > 0) {
        // Fallback to contentBoxSize
        const contentBox = entry.contentBoxSize[0];
        width = contentBox.inlineSize;
        height = contentBox.blockSize;
      } else {
        // Fallback to contentRect (old API, less precise)
        width = entry.contentRect.width;
        height = entry.contentRect.height;
      }

      // Round to avoid subpixel issues
      width = Math.floor(width);
      height = Math.floor(height);

      // ✅ If we're resizing the window (Tauri), use double RAF
      // to let the layout stabilize completely
      if (isWindowResizingRef.current) {
        // Double RAF to let layout stabilize after Tauri resize
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setSize(prev => {
              // Only update if dimensions changed and are valid
              if (prev.width !== width || prev.height !== height) {
                if (width > 0 && height > 0) {
                  return { width, height };
                }
              }
              return prev;
            });
          });
        });
      } else {
        // Normal update
        setSize(prev => {
          // Only update if dimensions changed
          if (prev.width === width && prev.height === height) {
            return prev;
          }
          return { width, height };
        });
      }
    });
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      setSize({ width: 0, height: 0 });
      return;
    }

    // Create observer with options
    observerRef.current = new ResizeObserver(updateSize);
    
    // Observe element with specified box
    observerRef.current.observe(element, { box });

    // ✅ Immediate initialization
    const initializeSize = () => {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const width = Math.floor(rect.width);
        const height = Math.floor(rect.height);
        setSize({ width, height });
      }
    };

    // Immediate initialization
    initializeSize();

    // ✅ Re-check after a few frames to handle asynchronous layouts
    // Particularly important after a Tauri window resize
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        initializeSize();
      });
    });

    // ✅ Listen to window resize to handle asynchronous Tauri resizes
    // Mark that we're resizing to use double RAF
    let resizeTimeout = null;
    const handleWindowResize = () => {
      // Mark that we're resizing
      isWindowResizingRef.current = true;
      
      // Reset flag after a short delay
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeTimeout = setTimeout(() => {
        isWindowResizingRef.current = false;
      }, 200); // 200ms should be enough for Tauri to finish the resize
    };

    window.addEventListener('resize', handleWindowResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleWindowResize);
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      // Reset refs
      isWindowResizingRef.current = false;
    };
  }, [ref, box, updateSize]);

  return size;
}

/**
 * Hook to get dimensions with device pixel ratio
 * Useful for canvases that need precise dimensions
 * 
 * @param {React.RefObject} ref - Reference to the element to observe
 * @returns {Object} - { width, height, dpr, scaledWidth, scaledHeight }
 */
export function useResizeObserverWithDPR(ref) {
  const size = useResizeObserver(ref);
  const [dpr, setDpr] = useState(1);

  useEffect(() => {
    // Update DPR if necessary
    const updateDPR = () => {
      const newDpr = window.devicePixelRatio || 1;
      setDpr(newDpr);
    };

    updateDPR();
    
    // Listen to DPR changes (rare but possible)
    const mediaQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    mediaQuery.addEventListener('change', updateDPR);

    return () => {
      mediaQuery.removeEventListener('change', updateDPR);
    };
  }, []);

  return {
    width: size.width,
    height: size.height,
    dpr,
    scaledWidth: size.width * dpr,
    scaledHeight: size.height * dpr,
  };
}

