import { loadEngineAssets, type DownloadProgress } from './assets'
import type { EngineStatus } from './uci'

// The engine speaks UCI over a line transport; what carries the lines is a detail.
// The WASM worker is one adapter, the scripted transport in ./scripted is the other.
export interface EngineTransport {
  send(line: string): void
  onLine(handler: (line: string) => void): void
  onError(handler: (message: string) => void): void
  terminate(): void
}

export interface TransportOptions {
  onStatus?: (status: EngineStatus, detail?: string) => void
  onProgress?: DownloadProgress
  signal?: AbortSignal
}

// Async because the engine is fetched from a CDN on first use; see ./assets.
export async function workerTransport(opts: TransportOptions = {}): Promise<EngineTransport> {
  opts.onStatus?.('downloading')
  const assets = await loadEngineAssets({ onProgress: opts.onProgress, signal: opts.signal })
  const worker = new Worker(assets.workerUrl)
  return {
    send: line => worker.postMessage(line),
    onLine: handler =>
      worker.addEventListener('message', (e: MessageEvent<unknown>) => handler(String(e.data))),
    onError: handler =>
      worker.addEventListener('error', e => handler(e.message || 'Engine failed to load')),
    terminate: () => {
      worker.terminate()
      assets.release()
    },
  }
}
