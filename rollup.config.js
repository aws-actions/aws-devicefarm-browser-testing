import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';

export default [
  {
    input: 'index.js',
    output: {
      file: 'dist/index.js',
      format: 'es',
      sourcemap: false,
      esModule: true,
      inlineDynamicImports: true
    },
    plugins: [
      json(),
      nodeResolve({
        preferBuiltins: true
      }),
      commonjs()
    ]
  }
];
