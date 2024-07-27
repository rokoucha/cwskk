import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

const chrome = defineConfig({
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/chrome/index.ts'),
      name: 'cwskk',
      fileName: 'background',
      formats: ['es'],
    },
    outDir: 'dist/chrome',
  },
})

const preview = defineConfig({
  build: {
    copyPublicDir: false,
    outDir: 'dist/preview',
  },
  plugins: [react()],
})

// export default defineConfig({
//   build: {
//     rollupOptions: {
//       input: {
//         chrome: resolve('./src/chrome/index.ts'),
//         preview: resolve('./src/preview/index.html'),
//       },
//       output: {
//         entryFileNames: (chunkInfo) => {
//           console.log(chunkInfo)
//           return `entry/[name].js`
//         },
//         assetFileNames: (chunkInfo) => {
//           console.log(chunkInfo)
//           return `assets/[name].[ext]`
//         },
//         chunkFileNames: (chunkInfo) => {
//           console.log(chunkInfo)
//           return `chunks/[name].js`
//         },
//       },
//     },
//   },
// })

const target = process.env.TARGET
export default target === 'chrome'
  ? chrome
  : target === 'preview'
    ? preview
    : () => {
        throw new Error('TARGET is not defined')
      }
