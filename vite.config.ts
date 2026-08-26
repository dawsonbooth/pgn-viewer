import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'
import solid from 'vite-plugin-solid'

// Serves the Stockfish build from node_modules in dev and copies it to dist/stockfish on build.
const STOCKFISH_FILES = ['stockfish-18-lite-single.js', 'stockfish-18-lite-single.wasm']
const mime = (f: string) => (f.endsWith('.wasm') ? 'application/wasm' : 'text/javascript')

function stockfishAssets(): Plugin {
  const require = createRequire(import.meta.url)
  const binDir = join(dirname(require.resolve('stockfish/package.json')), 'bin')
  return {
    name: 'stockfish-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0] ?? ''
        const file = STOCKFISH_FILES.find(f => url.endsWith(`/stockfish/${f}`))
        if (!file) return next()
        const path = join(binDir, file)
        if (!existsSync(path)) return next()
        res.setHeader('Content-Type', mime(file))
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        res.end(readFileSync(path))
      })
    },
    generateBundle() {
      for (const file of STOCKFISH_FILES) {
        this.emitFile({
          type: 'asset',
          fileName: `stockfish/${file}`,
          source: readFileSync(join(binDir, file)),
        })
      }
    },
  }
}

export default defineConfig({
  plugins: [solid(), tailwindcss(), stockfishAssets()],
  build: { target: 'es2022' },
})
