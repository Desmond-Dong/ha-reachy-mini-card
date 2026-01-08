import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/ha-reachy-mini-card.js',
  output: {
    file: 'ha-reachy-mini-card.js',
    format: 'iife',
    name: 'HaReachyMiniCard',
    sourcemap: true,
    banner: '// Reachy Mini 3D Card - Direct Daemon Connection\n// Version: 3.0.0\n// https://github.com/Desmond-Dong/ha-reachy-mini-card\n'
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