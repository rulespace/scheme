import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'agreval.js',
  output: {
    dir: 'compiled/output',
    format: 'es'
  },
  plugins: [nodeResolve()]
};