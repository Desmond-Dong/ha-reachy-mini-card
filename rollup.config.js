import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/reachy-mini-3d-card.js',
  output: {
    file: 'ha-reachy-mini-card.js',
    format: 'iife',
    name: 'ReachyMini3DCard',
    sourcemap: true,
    banner: '// Reachy Mini 3D Card - Direct Daemon Connection\n// Version: 2.0.0\n// https://github.com/Desmond-Dong/ha-reachy-mini-card\n'
  },
  plugins: [
    resolve({
      browser: true,
      preferBuiltins: false
    }),
    commonjs(),
    terser()
  ]
};
