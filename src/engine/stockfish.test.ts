import { describe, expect, it } from 'vitest'
import { scriptedTransport, uciHandshake } from './scripted'
import { StockfishEngine } from './stockfish'
import type { EngineAnalysis, EngineStatus } from './uci'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
const AFTER_D4 = 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1'

// The whole protocol is lines in, callbacks out: no WASM, no Worker. The transport
// answers the handshake, so the engine is ready as soon as it is built; with
// `handshake: false` the test times every line itself.
function engine(opts: { multiPv?: number; depth?: number; handshake?: boolean } = {}) {
  const analyses: EngineAnalysis[] = []
  const statuses: { status: EngineStatus; detail?: string }[] = []
  const transport = scriptedTransport(opts.handshake === false ? undefined : uciHandshake)
  const e = new StockfishEngine(
    {
      multiPv: opts.multiPv,
      depth: opts.depth,
      onAnalysis: a => analyses.push(a),
      onStatus: (status, detail) => statuses.push({ status, detail }),
    },
    transport,
  )
  return {
    e,
    t: transport,
    analyses,
    statuses,
    status: () => statuses.at(-1)?.status,
    gos: () => transport.sent.filter(c => c.startsWith('go ')),
  }
}

describe('handshake', () => {
  it('configures MultiPV and analyse mode, then reports ready', () => {
    const { t, statuses } = engine({ multiPv: 2, handshake: false })
    expect(t.sent).toEqual(['uci'])
    expect(statuses.map(s => s.status)).toEqual(['loading'])

    t.emit('uciok')
    expect(t.sent).toEqual([
      'uci',
      'setoption name MultiPV value 2',
      'setoption name UCI_AnalyseMode value true',
      'isready',
    ])
    expect(statuses.map(s => s.status)).toEqual(['loading'])

    t.emit('readyok')
    expect(statuses.map(s => s.status)).toEqual(['loading', 'ready'])
  })

  it('holds a position asked for before the engine is ready', () => {
    const { e, t, status } = engine({ handshake: false })
    e.analyze(START)
    expect(t.sent).toEqual(['uci'])

    t.emit('uciok')
    t.emit('readyok')
    expect(t.sent.slice(-2)).toEqual([`position fen ${START}`, 'go depth 22'])
    expect(status()).toBe('thinking')
  })
})

describe('one search at a time', () => {
  it('stops the running search and waits for bestmove before the next go', () => {
    const { e, t, gos } = engine()
    e.analyze(AFTER_E4)
    expect(gos()).toHaveLength(1)

    e.analyze(AFTER_D4)
    expect(t.sent.at(-1)).toBe('stop')
    expect(gos()).toHaveLength(1)

    t.emit('bestmove e2e4')
    expect(t.sent.slice(-2)).toEqual([`position fen ${AFTER_D4}`, 'go depth 22'])
    expect(gos()).toHaveLength(2)
  })

  it('ignores a repeat of the position it is already searching', () => {
    const { e, t, gos } = engine()
    e.analyze(AFTER_E4)
    e.analyze(AFTER_E4)
    expect(gos()).toHaveLength(1)
    expect(t.sent).not.toContain('stop')
  })

  it('drops a queued position when asked again for the one it is already searching', () => {
    const { e, t, gos } = engine()
    e.analyze(START)
    e.analyze(AFTER_E4)
    e.analyze(START)
    t.emit('bestmove e2e4')
    expect(gos()).toHaveLength(1)
    expect(t.sent.filter(c => c.startsWith('position fen'))).toEqual([`position fen ${START}`])
  })

  it('drops a queued position when stopped', () => {
    const { e, t, gos } = engine()
    e.analyze(AFTER_E4)
    e.analyze(AFTER_D4)
    e.stop()
    t.emit('bestmove e2e4')
    expect(gos()).toHaveLength(1)
  })

  it('searches to the configured depth', () => {
    const { e, gos } = engine({ depth: 30 })
    e.analyze(START)
    expect(gos()).toEqual(['go depth 30'])
  })
})

describe('analysis', () => {
  it("flips the score to White's perspective when Black is to move", () => {
    const { e, t, analyses } = engine()
    e.analyze(AFTER_E4)
    t.emit('info depth 10 multipv 1 score cp -30 pv e7e5 g1f3')
    expect(analyses.at(-1)).toEqual({
      fen: AFTER_E4,
      depth: 10,
      lines: [{ multipv: 1, depth: 10, cp: 30, pv: ['e7e5', 'g1f3'] }],
    })

    e.stop()
    t.emit('bestmove e7e5')
    e.analyze(START)
    t.emit('info depth 10 multipv 1 score cp -30 pv d2d4')
    expect(analyses.at(-1)?.lines[0]?.cp).toBe(-30)
  })

  it('tags every analysis with the position it belongs to', () => {
    const { e, t, analyses } = engine()
    e.analyze(START)
    t.emit('info depth 8 multipv 1 score cp 20 pv e2e4')
    e.analyze(AFTER_E4)
    t.emit('bestmove e2e4')
    t.emit('info depth 8 multipv 1 score cp -20 pv e7e5')
    expect(analyses.map(a => a.fen)).toEqual([START, AFTER_E4])
  })

  it('orders lines by multipv and reports the best line depth', () => {
    const { e, t, analyses } = engine({ multiPv: 3 })
    e.analyze(START)
    t.emit('info depth 9 multipv 2 score cp 10 pv d2d4')
    t.emit('info depth 9 multipv 1 score cp 25 pv e2e4')
    expect(analyses.at(-1)?.lines.map(l => l.multipv)).toEqual([1, 2])
    expect(analyses.at(-1)?.depth).toBe(9)
  })

  it('keeps the deeper result when a shallower one arrives for the same line', () => {
    const { e, t, analyses } = engine()
    e.analyze(START)
    t.emit('info depth 12 multipv 1 score cp 25 pv e2e4')
    t.emit('info depth 8 multipv 1 score cp 900 pv a2a3')
    expect(analyses).toHaveLength(1)
    expect(analyses.at(-1)?.lines[0]?.cp).toBe(25)
  })

  it('clears the previous position lines before the next search', () => {
    const { e, t, analyses } = engine()
    e.analyze(START)
    t.emit('info depth 9 multipv 1 score cp 25 pv e2e4')
    t.emit('info depth 9 multipv 2 score cp 10 pv d2d4')
    e.analyze(AFTER_E4)
    t.emit('bestmove e2e4')
    t.emit('info depth 9 multipv 1 score cp -25 pv e7e5')
    expect(analyses.at(-1)?.lines).toHaveLength(1)
  })

  it('ignores info that arrives while nothing is being searched', () => {
    const { t, analyses } = engine()
    t.emit('info depth 9 multipv 1 score cp 25 pv e2e4')
    expect(analyses).toHaveLength(0)
  })
})

describe('lifecycle', () => {
  it('reports a transport failure as an engine error', () => {
    const { t, statuses } = engine()
    t.fail('boom')
    expect(statuses.at(-1)).toEqual({ status: 'error', detail: 'boom' })
  })

  it('goes quiet once terminated', () => {
    const { e, t } = engine()
    e.analyze(START)
    const sentSoFar = t.sent.length
    e.terminate()
    expect(t.terminated).toBe(true)
    e.analyze(AFTER_E4)
    expect(t.sent).toHaveLength(sentSoFar)
  })
})
