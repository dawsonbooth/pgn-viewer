// The engine speaks UCI over a line transport; what carries the lines is a detail.
// The WASM worker is one adapter, the scripted transport in ./scripted is the other.
export interface EngineTransport {
  send(line: string): void
  onLine(handler: (line: string) => void): void
  onError(handler: (message: string) => void): void
  terminate(): void
}

const WORKER_URL = `${import.meta.env.BASE_URL}stockfish/stockfish-18-lite-single.js`

export function workerTransport(): EngineTransport {
  const worker = new Worker(WORKER_URL)
  return {
    send: line => worker.postMessage(line),
    onLine: handler =>
      worker.addEventListener('message', (e: MessageEvent<unknown>) => handler(String(e.data))),
    onError: handler =>
      worker.addEventListener('error', e => handler(e.message || 'Engine failed to load')),
    terminate: () => worker.terminate(),
  }
}
