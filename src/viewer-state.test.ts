import { createRoot } from 'solid-js'
import { describe, expect, it } from 'vitest'
import {
  scriptedTransport,
  stubEngine,
  uciHandshake,
  type Responder,
  type ScriptedTransport,
} from './engine/scripted'
import { StockfishEngine } from './engine/stockfish'
import type { EngineFactory } from './engine/uci'
import { uniqueSample } from './test-utils'
import { createViewer, type Viewer, type ViewerOptions } from './viewer-state'

async function openSample(options?: ViewerOptions): Promise<{ v: Viewer; dispose: () => void }> {
  const { v, dispose } = createRoot(d => ({ v: createViewer(options), dispose: d }))
  await v.openFile(uniqueSample())
  return { v, dispose }
}

// A real StockfishEngine over a scripted transport: the viewer drives the true
// protocol while the test sees every command and decides what comes back.
function scriptedEngine(respond: Responder = stubEngine) {
  const transports: ScriptedTransport[] = []
  const createEngine: EngineFactory = opts => {
    const t = scriptedTransport(respond)
    transports.push(t)
    return new StockfishEngine(opts, t)
  }
  return { createEngine, transports, last: () => transports.at(-1)! }
}

const failToStart: EngineFactory = () => Promise.reject(new Error('no WASM here'))

// Stands in for the real factory, which reports the CDN download before the engine exists.
const reportsDownload =
  (loaded: number, total: number): EngineFactory =>
  opts => {
    opts.onStatus('downloading')
    opts.onProgress?.(loaded, total)
    return new StockfishEngine(opts, scriptedTransport(stubEngine))
  }

// effects and the engine promise settle on the next macrotask
const settle = () => new Promise(r => setTimeout(r, 0))

const san = (v: Viewer) => v.cursor.node()?.san

describe('createViewer', () => {
  it('opens a file and selects games', async () => {
    const { v, dispose } = await openSample()
    expect(v.games()).toHaveLength(3)
    expect(v.doc()?.complete).toBe(true)
    expect(v.selectedIndex()).toBe(0)
    v.nextGame()
    expect(v.selectedIndex()).toBe(1)
    v.selectGame(99)
    expect(v.selectedIndex()).toBe(2)
    v.prevGame()
    expect(v.selectedIndex()).toBe(1)
    dispose()
  })

  it('points the cursor at the selected game', async () => {
    const { v, dispose } = await openSample()
    v.cursor.next()
    expect(san(v)).toBe('Ng5')
    v.selectGame(1)
    expect(v.cursor.atStart()).toBe(true)
    v.cursor.next()
    expect(san(v)).toBe('e4')
    v.selectGame(0)
    expect(san(v)).toBe('Ng5')
    dispose()
  })

  it('feeds the cursor the continuation setting', async () => {
    const { v, dispose } = await openSample()
    v.selectGame(1)
    expect(v.cursor.play('a2', 'a3').kind).toBe('explored')
    v.toggleContinuations()
    expect(v.showContinuations()).toBe(false)
    expect(v.cursor.isExploring()).toBe(false)
    expect(v.cursor.canNext()).toBe(false)
    dispose()
  })

  it('exposes what the cursor remembers for persistence', async () => {
    const { v, dispose } = await openSample()
    v.cursor.next()
    v.selectGame(1)
    v.cursor.next()
    expect(v.cursor.positions()).toEqual({ 0: 1, 1: 1 })
    dispose()
  })
})

describe('engine', () => {
  it('stays off until switched on, then analyses the position on the board', async () => {
    const { createEngine, transports, last } = scriptedEngine()
    const { v, dispose } = await openSample({ createEngine })
    expect(transports).toHaveLength(0)
    expect(v.analysis()).toBeUndefined()

    v.toggleEngine()
    await settle()
    expect(transports).toHaveLength(1)
    expect(last().sent).toContain(`position fen ${v.cursor.fen()}`)
    expect(v.analysis()?.fen).toBe(v.cursor.fen())
    expect(v.analysis()?.lines).toHaveLength(3)
    dispose()
  })

  it('re-analyses when the cursor moves', async () => {
    const { createEngine, last } = scriptedEngine()
    const { v, dispose } = await openSample({ createEngine })
    v.toggleEngine()
    await settle()
    const before = v.cursor.fen()

    v.cursor.next()
    await settle()
    expect(v.cursor.fen()).not.toBe(before)
    expect(last().sent).toContain(`position fen ${v.cursor.fen()}`)
    expect(v.analysis()?.fen).toBe(v.cursor.fen())
    dispose()
  })

  it('publishes nothing while the analysis belongs to a position we have left', async () => {
    // handshake only: the engine never reports on its own, so the old result lingers
    const { createEngine, last } = scriptedEngine(uciHandshake)
    const { v, dispose } = await openSample({ createEngine })
    v.toggleEngine()
    await settle()
    const first = v.cursor.fen()!
    last().emit('info depth 12 multipv 1 score cp 30 pv e2e4')
    expect(v.analysis()?.fen).toBe(first)

    v.cursor.next()
    await settle()
    expect(v.analysis()).toBeUndefined()

    v.cursor.prev()
    await settle()
    expect(v.analysis()?.fen).toBe(first)

    // and the engine did not wander off to the position we bounced through
    last().emit('bestmove e2e4')
    expect(last().sent.filter(c => c.startsWith('position fen'))).toEqual([`position fen ${first}`])
    dispose()
  })

  it('shuts the engine down when switched off', async () => {
    const { createEngine, last } = scriptedEngine()
    const { v, dispose } = await openSample({ createEngine })
    v.toggleEngine()
    await settle()

    v.toggleEngine()
    await settle()
    expect(last().terminated).toBe(true)
    expect(v.engineStatus()).toBeUndefined()
    expect(v.analysis()).toBeUndefined()
    dispose()
  })

  it('builds a fresh engine when switched on again', async () => {
    const { createEngine, transports } = scriptedEngine()
    const { v, dispose } = await openSample({ createEngine })
    v.toggleEngine()
    await settle()
    v.toggleEngine()
    await settle()
    v.toggleEngine()
    await settle()
    expect(transports).toHaveLength(2)
    expect(transports[0]!.terminated).toBe(true)
    expect(transports[1]!.terminated).toBe(false)
    expect(v.analysis()?.fen).toBe(v.cursor.fen())
    dispose()
  })

  it('reports an engine that fails to start', async () => {
    const { v, dispose } = await openSample({ createEngine: failToStart })
    v.toggleEngine()
    await settle()
    expect(v.engineStatus()).toBe('error')
    expect(v.engineDetail()).toBe('no WASM here')
    dispose()
  })

  it('terminates the engine when the viewer is disposed', async () => {
    const { createEngine, last } = scriptedEngine()
    const { v, dispose } = await openSample({ createEngine })
    v.toggleEngine()
    await settle()
    dispose()
    expect(last().terminated).toBe(true)
  })

  describe('the engine download prompt', () => {
    it('asks before downloading and only starts once accepted', async () => {
      const { createEngine } = scriptedEngine()
      const { v, dispose } = await openSample({
        createEngine,
        engineNeedsDownload: async () => true,
      })
      v.toggleEngine()
      await settle()
      expect(v.downloadPrompt()).toBe(true)
      expect(v.engineEnabled()).toBe(false)

      v.confirmEngineDownload()
      await settle()
      expect(v.downloadPrompt()).toBe(false)
      expect(v.engineEnabled()).toBe(true)
      dispose()
    })

    it('leaves the engine off when the prompt is dismissed', async () => {
      const { createEngine } = scriptedEngine()
      const { v, dispose } = await openSample({
        createEngine,
        engineNeedsDownload: async () => true,
      })
      v.toggleEngine()
      await settle()
      v.dismissEngineDownload()
      expect(v.downloadPrompt()).toBe(false)
      expect(v.engineEnabled()).toBe(false)
      dispose()
    })

    it('toggling again while the prompt is up dismisses it', async () => {
      const { createEngine } = scriptedEngine()
      const { v, dispose } = await openSample({
        createEngine,
        engineNeedsDownload: async () => true,
      })
      v.toggleEngine()
      await settle()
      v.toggleEngine()
      await settle()
      expect(v.downloadPrompt()).toBe(false)
      expect(v.engineEnabled()).toBe(false)
      dispose()
    })

    it('does not ask again once the engine is cached', async () => {
      const { createEngine } = scriptedEngine()
      const { v, dispose } = await openSample({
        createEngine,
        engineNeedsDownload: async () => false,
      })
      v.toggleEngine()
      await settle()
      expect(v.downloadPrompt()).toBe(false)
      expect(v.engineEnabled()).toBe(true)
      dispose()
    })

    it('reports download progress while the engine loads', async () => {
      const { v, dispose } = await openSample({
        createEngine: reportsDownload(3_000_000, 6_000_000),
      })
      v.toggleEngine()
      await settle()
      expect(v.engineProgress()).toStrictEqual({ loaded: 3_000_000, total: 6_000_000 })
      dispose()
    })

    it('forgets the download once the engine is switched off', async () => {
      const { v, dispose } = await openSample({ createEngine: reportsDownload(1, 2) })
      v.toggleEngine()
      await settle()
      expect(v.engineProgress()).toBeDefined()
      v.toggleEngine()
      await settle()
      expect(v.engineProgress()).toBeUndefined()
      dispose()
    })
  })
})
