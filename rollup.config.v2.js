import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/reachy-mini-3d-card-v2.js',
  output: {
    file: 'dist/reachy-mini-3d-card.js',
    format: 'iife',
    name: 'ReachyMini3DCard',
    sourcemap: true,
    // 添加 banner 说明版本
    banner: '// Reachy Mini 3D Card V2 - Direct Connection to Daemon\n// Version: 2.0.0\n// https://github.com/Desmond-Dong/ha-reachy-mini-card\n'
  },
  plugins: [
    resolve({
      browser: true,
      preferBuiltins: false
    }),
    commonjs(),
    terser({
      keep_classnames: true,
      keep_fnames: false,
      // 保留必要的注释
      format: {
        comments: /^!/ // 保留以 ! 开头的注释
      }
    })
  ]
};
