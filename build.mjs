import esbuild from 'esbuild'
import { copyFile, mkdir, rm } from 'fs/promises'

const [_node, _script, mode] = /** @type {string[]} */ (process.argv)

/** @type {esbuild.BuildOptions} */
const options = {
  bundle: true,
  entryPoints: ['./src/index_browser.tsx', './src/index_chrome.ts'],
  format: 'esm',
  logLevel: 'info',
  minify: false,
  outdir: './dist',
  platform: 'browser',
  sourcemap: true,
  target: 'es2021',
  treeShaking: true,
}

await rm('./dist', { recursive: true, force: true })
await mkdir('./dist', { recursive: true })

await copyFile('./public/index.html', './dist/index.html')
await copyFile('./public/manifest.json', './dist/manifest.json')

switch (mode) {
  case 'serve':
    {
      await esbuild
        .serve(
          {
            port: 3000,
            servedir: './dist',
            onRequest({ method, path, remoteAddress, status, timeInMS }) {
              console.log(
                `${remoteAddress} [${new Date().toISOString()}] "${method} ${path}" ${status} ${timeInMS}ms`,
              )
            },
          },
          { ...options },
        )
        .then(() => console.log('Listening on http://localhost:3000'))
    }
    break

  case 'build':
  default:
    {
      await esbuild.build({ ...options })
    }
    break
}
