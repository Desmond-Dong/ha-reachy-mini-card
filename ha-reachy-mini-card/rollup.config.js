import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

/**
 * Rollup configuration for Reachy Mini 3D Card
 * 
 * This configuration bundles all JavaScript into a single file for HACS distribution.
 * Requirements: 1.3, 1.6
 * 
 * - Bundles Three.js, URDFLoader, and all dependencies into a single file
 * - No external CDN dependencies at runtime
 * - ES module format for modern browsers
 * - Minified for production
 */
export default {
  input: 'src/ha-reachy-mini-card.js',
  output: {
    file: 'dist/ha-reachy-mini-card.js',
    format: 'es',
    sourcemap: false,
    // Add banner with version and build info
    banner: `/**
 * Reachy Mini 3D Card for Home Assistant
 * @version 1.0.0
 * @license MIT
 * 
 * A custom Lovelace card that provides real-time 3D visualization
 * of the Reachy Mini robot by connecting to the daemon via WebSocket.
 * 
 * Built: ${new Date().toISOString()}
 */`
  },
  plugins: [
    // Resolve node_modules dependencies
    resolve({
      browser: true,
      preferBuiltins: false
    }),
    // Minify for production
    terser({
      format: {
        comments: /^!/  // Preserve banner comment
      },
      compress: {
        drop_console: false,  // Keep console.info for version logging
        passes: 2
      }
    })
  ],
  // Warn about circular dependencies but don't fail
  onwarn(warning, warn) {
    // Suppress circular dependency warnings from Three.js
    if (warning.code === 'CIRCULAR_DEPENDENCY') {
      return;
    }
    warn(warning);
  }
};
