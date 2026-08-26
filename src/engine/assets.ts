// Stockfish is ~7 MB of WebAssembly. Serving it from our own origin would spend the
// GitHub Pages bandwidth allowance on every visit, so it comes from a public npm CDN on
// first use and is kept in the Cache API: one download per browser, not one per visit.
// The bytes are executable code from a third party, so each file is checked against a
// pinned hash before it is cached or run.

const VERSION = '18.0.8'
const BUILD = 'stockfish-18-lite-single'
// WebAssembly.instantiateStreaming refuses anything but application/wasm, and the blob a
// download or a cache hit gives back does not carry the CDN's type, so it is set here.
const GLUE = { file: `${BUILD}.js`, type: 'text/javascript' }
const WASM = { file: `${BUILD}.wasm`, type: 'application/wasm' }
const CACHE_NAME = `stockfish-${VERSION}`

// jsDelivr refuses this package — the full NNUE builds put the tarball over its 150 MB
// limit — so unpkg is primary and esm.sh serves the same tarball when unpkg is unreachable.
const MIRRORS = ['https://unpkg.com/stockfish', 'https://esm.sh/stockfish']

// sha-256 of the files in stockfish@18.0.8. A mirror serving anything else is skipped.
const DIGESTS: Record<string, string> = {
  [GLUE.file]: '5243fd9b276cab7dfe3ad1d43ab9ead73568fac76468c614242977a210c4a391',
  [WASM.file]: 'a8fbc05ec6920b56d7485826dcb02c5ffd2826bcbf751cf973046f237a9096f1',
}

// What the prompt quotes before asking. The live figure comes from Content-Length.
export const ENGINE_DOWNLOAD_BYTES = 7_316_840

export type DownloadProgress = (loaded: number, total: number) => void

export interface LoadOptions {
  onProgress?: DownloadProgress
  signal?: AbortSignal
}

export interface EngineAssets {
  // the glue script, with the wasm location in its fragment
  readonly workerUrl: string
  // frees both object URLs; call once the worker is gone
  release(): void
}

const urlsFor = (file: string) => MIRRORS.map(m => `${m}@${VERSION}/bin/${file}`)

function cacheStorage(): CacheStorage | undefined {
  // absent on plain http and in some private windows
  try {
    return globalThis.caches
  } catch {
    return undefined
  }
}

// Looks for the file under every mirror URL, so a visit that fell back to esm.sh still
// hits the cache next time. Matching does not read the body.
async function matchCached(file: string): Promise<Response | undefined> {
  const caches = cacheStorage()
  if (!caches) return undefined
  try {
    const cache = await caches.open(CACHE_NAME)
    for (const url of urlsFor(file)) {
      const hit = await cache.match(url)
      if (hit) return hit
    }
  } catch {
    // an unusable cache is a slow path, not a failure
  }
  return undefined
}

async function putCached(url: string, blob: Blob): Promise<void> {
  const caches = cacheStorage()
  if (!caches) return
  try {
    const cache = await caches.open(CACHE_NAME)
    await cache.put(url, new Response(blob))
  } catch {
    // out of quota: the engine still runs, it just downloads again next time
  }
}

async function sha256(blob: Blob): Promise<string | undefined> {
  // no SubtleCrypto on plain http, where there is nothing to protect anyway
  if (!globalThis.crypto?.subtle) return undefined
  const hash = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('')
}

async function readBody(res: Response, onProgress?: DownloadProgress): Promise<Blob> {
  const total = Number(res.headers.get('content-length')) || 0
  if (!res.body || !onProgress) return await res.blob()
  const reader = res.body.getReader()
  const chunks: BlobPart[] = []
  let loaded = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    loaded += value.byteLength
    onProgress(loaded, total)
  }
  return new Blob(chunks)
}

const describe = (e: unknown) => (e instanceof Error ? e.message : String(e))

async function download(file: string, opts: LoadOptions): Promise<Blob> {
  let lastError: unknown
  for (const url of urlsFor(file)) {
    try {
      const res = await fetch(url, { signal: opts.signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await readBody(res, opts.onProgress)
      const actual = await sha256(blob)
      if (actual && actual !== DIGESTS[file]) throw new Error('unexpected contents')
      await putCached(url, blob)
      return blob
    } catch (e) {
      if (opts.signal?.aborted) throw e
      lastError = e
    }
  }
  throw new Error(`Could not download ${file} (${describe(lastError)})`)
}

async function load(asset: { file: string; type: string }, opts: LoadOptions): Promise<Blob> {
  const hit = await matchCached(asset.file)
  let blob: Blob
  if (hit) {
    blob = await hit.blob()
    opts.onProgress?.(blob.size, blob.size)
  } else {
    blob = await download(asset.file, opts)
  }
  // a retype, not a copy
  return blob.type === asset.type ? blob : blob.slice(0, blob.size, asset.type)
}

// True when the engine can start without touching the network, which is what decides
// whether the viewer asks before switching it on.
export async function isEngineCached(): Promise<boolean> {
  const hits = await Promise.all([matchCached(GLUE.file), matchCached(WASM.file)])
  return hits.every(Boolean)
}

export async function loadEngineAssets(opts: LoadOptions = {}): Promise<EngineAssets> {
  // the glue is 21 KB against the wasm's 7 MB, so progress tracks the wasm alone
  const js = await load(GLUE, { signal: opts.signal })
  const wasm = await load(WASM, opts)
  const wasmUrl = URL.createObjectURL(wasm)
  // A cross-origin script cannot be a worker directly, so the glue runs from a blob URL.
  // That puts the wasm out of its reach — it resolves it against its own location — and
  // stockfish.js reads the wasm URL from its fragment for exactly this case.
  const jsUrl = URL.createObjectURL(js)
  return {
    workerUrl: `${jsUrl}#${encodeURIComponent(wasmUrl)}`,
    release() {
      URL.revokeObjectURL(jsUrl)
      URL.revokeObjectURL(wasmUrl)
    },
  }
}
