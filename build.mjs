import { pnpPlugin } from '@yarnpkg/esbuild-plugin-pnp'
import esbuild from 'esbuild'

const [_node, _script, mode] = /** @type {string[]} */ (process.argv)

await esbuild.build({
  bundle: true,
  entryPoints: ['./src/index.ts'],
  format: 'esm',
  minify: false,
  outdir: './dist',
  platform: 'browser',
  plugins: [pnpPlugin()],
  sourcemap: true,
  treeShaking: true,
  watch: mode === 'watch',
})
