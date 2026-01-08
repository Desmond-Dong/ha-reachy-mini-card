import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/reachy-mini-3d-card.js',
  output: {
    file: 'dist/reachy-mini-3d-card-v1.js',
    format: 'iife',
    name: 'ReachyMini3DCard',
    sourcemap: true,
    banner: '// Reachy Mini 3D Card V1 - ESPHome Version (Legacy)\n// Consider upgrading to V2 for better performance\n// https://github.com/Desmond-Dong/ha-reachy-mini-card\n'
  },
  plugins: [
    resolve({
      browser: true,
      preferBuiltins: false
    }),
    commonjs(),
    terser({
      keep_classnames: true,
      keep_fnames: false
    })
  ]
};
