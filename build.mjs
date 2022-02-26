import { pnpPlugin } from '@yarnpkg/esbuild-plugin-pnp'
import esbuild from 'esbuild'
import { copyFile } from 'fs/promises'

const [_node, _script, mode] = /** @type {string[]} */ (process.argv)

await copyFile('./manifest.json', './dist/manifest.json')

await esbuild.build({
  bundle: true,
  entryPoints: ['./src/index.ts'],
  format: 'esm',
  logLevel: 'info',
  minify: false,
  outdir: './dist',
  platform: 'browser',
  plugins: [pnpPlugin()],
  sourcemap: true,
  treeShaking: true,
  watch: mode === 'watch',
})
