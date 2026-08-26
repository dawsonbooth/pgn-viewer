// One search at a time: a new position sends stop and waits for bestmove before the next go.
import { workerTransport, type EngineTransport } from './transport'
import { parseInfo, sideToMove, type Engine, type EngineLine, type EngineOptions } from './uci'

export class StockfishEngine implements Engine {
  private readonly transport: EngineTransport
  private ready = false
  private searching = false
  private currentFen: string | undefined
  private pendingFen: string | undefined
  private lines = new Map<number, EngineLine>()
  private readonly multiPv: number
  private readonly depth: number
  private terminated = false

  // The transport is the seam: the WASM worker by default, a scripted one in tests.
  constructor(
    private readonly opts: EngineOptions,
    transport?: EngineTransport,
  ) {
    this.multiPv = opts.multiPv ?? 3
    this.depth = opts.depth ?? 22
    opts.onStatus('loading')
    this.transport = transport ?? workerTransport()
    this.transport.onLine(line => this.onLine(line))
    this.transport.onError(message => opts.onStatus('error', message))
    this.send('uci')
  }

  private send(cmd: string) {
    if (!this.terminated) this.transport.send(cmd)
  }

  private onLine(line: string) {
    if (line === 'uciok') {
      this.send(`setoption name MultiPV value ${this.multiPv}`)
      this.send('setoption name UCI_AnalyseMode value true')
      this.send('isready')
      return
    }
    if (line === 'readyok') {
      this.ready = true
      this.opts.onStatus('ready')
      this.flush()
      return
    }
    if (line.startsWith('bestmove')) {
      this.searching = false
      this.opts.onStatus('ready')
      this.flush()
      return
    }
    if (this.searching && this.currentFen && line.startsWith('info ')) {
      const parsed = parseInfo(line, sideToMove(this.currentFen))
      if (!parsed) return
      const prev = this.lines.get(parsed.multipv)
      if (prev && prev.depth > parsed.depth) return
      this.lines.set(parsed.multipv, parsed)
      const lines = [...this.lines.values()].toSorted((a, b) => a.multipv - b.multipv)
      this.opts.onAnalysis({ fen: this.currentFen, lines, depth: lines[0]?.depth ?? 0 })
    }
  }

  analyze(fen: string) {
    if (this.terminated) return
    if (this.searching && this.currentFen === fen) {
      // navigating away and straight back: drop the queued position rather than
      // switch to it once bestmove lands, which would blank this position's result
      this.pendingFen = undefined
      return
    }
    this.pendingFen = fen
    if (this.searching) this.send('stop')
    else this.flush()
  }

  stop() {
    this.pendingFen = undefined
    if (this.searching) this.send('stop')
  }

  private flush() {
    if (!this.ready || this.searching || !this.pendingFen) return
    const fen = this.pendingFen
    this.pendingFen = undefined
    this.currentFen = fen
    this.lines.clear()
    this.searching = true
    this.opts.onStatus('thinking')
    this.send(`position fen ${fen}`)
    this.send(`go depth ${this.depth}`)
  }

  terminate() {
    this.terminated = true
    this.transport.terminate()
  }
}
