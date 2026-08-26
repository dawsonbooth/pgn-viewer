import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isEngineCached, loadEngineAssets } from './assets'

const GLUE = 'https://unpkg.com/stockfish@18.0.8/bin/stockfish-18-lite-single.js'

const realFetch = globalThis.fetch
beforeEach(async () => {
  for (const key of await caches.keys()) await caches.delete(key)
})
afterEach(() => {
  globalThis.fetch = realFetch
  vi.restoreAllMocks()
})

// Serves bytes that are not the pinned build, from every mirror.
function serveJunk(size = 1024) {
  const calls: string[] = []
  globalThis.fetch = vi.fn<typeof fetch>(async (input: RequestInfo | URL) => {
    calls.push(String(input))
    return new Response(new Uint8Array(size), { headers: { 'content-length': String(size) } })
  }) as typeof fetch
  return calls
}

describe('engine assets', () => {
  it('refuses bytes that are not the pinned Stockfish build', async () => {
    serveJunk()
    await expect(loadEngineAssets()).rejects.toThrow(/unexpected contents/)
  })

  it('tries the second mirror before giving up', async () => {
    const calls = serveJunk()
    await expect(loadEngineAssets()).rejects.toThrow(/Could not download/)
    expect(calls.some(u => u.startsWith('https://unpkg.com/'))).toBe(true)
    expect(calls.some(u => u.startsWith('https://esm.sh/'))).toBe(true)
  })

  it('stops at the first mirror once the download is aborted', async () => {
    const calls = serveJunk()
    const aborted = new AbortController()
    aborted.abort()
    await expect(loadEngineAssets({ signal: aborted.signal })).rejects.toThrow(
      /unexpected contents/,
    )
    expect(calls).toHaveLength(1)
  })

  it('leaves nothing cached when the bytes are rejected', async () => {
    serveJunk()
    await loadEngineAssets().catch(() => undefined)
    expect(await isEngineCached()).toBe(false)
  })
})

// The load-bearing trick: a cross-origin script cannot be a worker, so the glue runs from
// a blob URL and takes the wasm location from its own fragment. That breaks silently if a
// mirror or stockfish.js changes, which is what these are worth the network for.
describe('engine assets over the network', () => {
  it('reports progress against Content-Length while the wasm downloads', async () => {
    const glue = await realFetch(GLUE).then(r => r.arrayBuffer())
    globalThis.fetch = vi.fn<typeof fetch>(async (input: RequestInfo | URL) => {
      const body = String(input).endsWith('.wasm') ? new Uint8Array(65_536) : new Uint8Array(glue)
      return new Response(body, { headers: { 'content-length': String(body.byteLength) } })
    }) as typeof fetch

    const seen: number[] = []
    await loadEngineAssets({ onProgress: (loaded, total) => seen.push(loaded / total) }).catch(
      () => undefined,
    )
    expect(seen.length).toBeGreaterThan(0)
    expect(seen.at(-1)).toBe(1)
    expect(seen).toStrictEqual([...seen].toSorted((a, b) => a - b))
  }, 60_000)

  it('loads Stockfish from the CDN, searches a position, and caches it', async () => {
    const assets = await loadEngineAssets()
    const worker = new Worker(assets.workerUrl)
    const lines: string[] = []
    const bestmove = new Promise<string>((resolve, reject) => {
      worker.addEventListener('message', e => {
        const line = String(e.data)
        lines.push(line)
        if (line.startsWith('bestmove')) resolve(line)
      })
      worker.addEventListener('error', e => reject(new Error(e.message || 'worker failed')))
    })
    worker.postMessage('uci')
    worker.postMessage('position startpos')
    worker.postMessage('go depth 10')
    const best = await bestmove
    worker.terminate()
    assets.release()

    expect(lines).toContain('uciok')
    expect(best).toMatch(/^bestmove [a-h][1-8][a-h][1-8]/)
    // the next visit starts without touching the network
    expect(await isEngineCached()).toBe(true)
  }, 180_000)
})
