import { batch, createEffect, createMemo, createSignal, on, onCleanup } from 'solid-js'
import { parsePgnStream, type GameRecord, type PgnDocument } from './chess/pgn'
import { createCursor } from './cursor'
import type { Engine, EngineAnalysis, EngineFactory, EngineStatus } from './engine/uci'
import { fingerprintFile } from './files/fingerprint'
import {
  createStateSaver,
  loadDocumentState,
  type DocumentState,
} from './persistence/document-state'

export type Orientation = 'white' | 'black'

export interface ViewerOptions {
  // swapped for a scripted engine in tests and stories
  createEngine?: EngineFactory
}

// Lazy so Stockfish stays out of the main bundle until the engine is switched on.
const loadStockfish: EngineFactory = async opts => {
  const { StockfishEngine } = await import('./engine/stockfish')
  return new StockfishEngine(opts)
}

export function createViewer(options: ViewerOptions = {}) {
  const [doc, setDoc] = createSignal<PgnDocument>()
  const [games, setGames] = createSignal<GameRecord[]>([])
  const [openError, setOpenError] = createSignal<string>()
  const [isOpening, setIsOpening] = createSignal(false)
  let parseAbort: AbortController | undefined
  const [selectedIndex, setSelectedIndex] = createSignal(0)
  const [orientation, setOrientation] = createSignal<Orientation>('white')
  const [showContinuations, setShowContinuations] = createSignal(true)
  const [showComments, setShowComments] = createSignal(true)
  const [engineEnabled, setEngineEnabled] = createSignal(false)
  const [gamesOpen, setGamesOpen] = createSignal(false)

  const selectedRecord = createMemo(() => games()[selectedIndex()])
  const cursor = createCursor({ record: selectedRecord, showContinuations })

  const selectGame = (index: number) => {
    const list = games()
    if (!list.length) return
    setSelectedIndex(Math.max(0, Math.min(list.length - 1, Math.floor(index))))
  }
  const nextGame = () => selectGame(selectedIndex() + 1)
  const prevGame = () => selectGame(selectedIndex() - 1)

  const createEngine = options.createEngine ?? loadStockfish
  const [engineStatus, setEngineStatus] = createSignal<EngineStatus>()
  const [engineDetail, setEngineDetail] = createSignal<string>()
  const [reported, setReported] = createSignal<EngineAnalysis>()
  let engine: Engine | undefined
  let enginePromise: Promise<Engine> | undefined

  // Published only while it still describes the position on the board, so nothing
  // downstream has to check.
  const analysis = createMemo(() => {
    const a = reported()
    return a && a.fen === cursor.fen() ? a : undefined
  })

  const ensureEngine = () => {
    if (enginePromise) return enginePromise
    enginePromise = (async () => {
      engine = await createEngine({
        onAnalysis: setReported,
        onStatus: (s, detail) => {
          setEngineStatus(s)
          setEngineDetail(detail)
        },
      })
      return engine
    })()
    return enginePromise
  }

  createEffect(
    on([engineEnabled, cursor.fen], ([enabled, f]) => {
      if (!enabled) {
        engine?.terminate()
        engine = undefined
        enginePromise = undefined
        setReported(undefined)
        setEngineStatus(undefined)
        setEngineDetail(undefined)
        return
      }
      if (!f) return
      void ensureEngine().then(
        e => {
          if (engineEnabled() && cursor.fen() === f) e.analyze(f)
        },
        // a failed load stays failed until the engine is switched off and on again
        err => {
          setEngineStatus('error')
          setEngineDetail(err instanceof Error ? err.message : String(err))
        },
      )
    }),
  )
  onCleanup(() => engine?.terminate())
  const save = createStateSaver()
  createEffect(() => {
    const d = doc()
    if (!d) return
    const state: DocumentState = {
      selectedGame: selectedIndex(),
      gamePositions: cursor.positions(),
      continuationVisibility: showContinuations(),
      commentaryVisibility: showComments(),
      boardOrientation: orientation(),
      updatedAt: Date.now(),
    }
    save(d.fingerprint, state)
  })
  const openFile = async (file: File) => {
    parseAbort?.abort()
    const abort = new AbortController()
    parseAbort = abort
    setIsOpening(true)
    setOpenError(undefined)
    try {
      const fingerprint = await fingerprintFile(file)
      const saved = await loadDocumentState(fingerprint)
      if (abort.signal.aborted) return
      batch(() => {
        setGames([])
        setDoc({ name: file.name, fingerprint, games: [], complete: false })
        setSelectedIndex(0)
        cursor.restore(saved?.gamePositions)
        setGamesOpen(false)
        if (saved) {
          setShowContinuations(saved.continuationVisibility)
          setShowComments(saved.commentaryVisibility)
          if (saved.boardOrientation) setOrientation(saved.boardOrientation)
        }
      })
      let restored = !saved
      let acc: GameRecord[] = []
      await parsePgnStream(
        file,
        (batchGames, complete) => {
          if (abort.signal.aborted) return
          acc = acc.concat(batchGames)
          batch(() => {
            setGames(acc)
            setDoc(d => (d ? { ...d, games: acc, complete } : d))
            if (!restored && saved && acc.length > saved.selectedGame) {
              restored = true
              selectGame(saved.selectedGame)
            } else if (!restored && complete && saved) {
              restored = true
              selectGame(Math.min(saved.selectedGame, acc.length - 1))
            }
          })
        },
        { signal: abort.signal },
      )
      if (acc.length === 0) setOpenError('No games found in this file.')
    } catch (e) {
      setOpenError(e instanceof Error ? e.message : String(e))
    } finally {
      if (parseAbort === abort) setIsOpening(false)
    }
  }
  const flip = () => setOrientation(o => (o === 'white' ? 'black' : 'white'))
  const toggleContinuations = () => setShowContinuations(v => !v)
  const toggleComments = () => setShowComments(v => !v)
  const toggleEngine = () => setEngineEnabled(v => !v)

  return {
    doc,
    games,
    openError,
    isOpening,
    openFile,
    selectedIndex,
    selectedRecord,
    selectGame,
    nextGame,
    prevGame,
    cursor,
    orientation,
    flip,
    showContinuations,
    toggleContinuations,
    showComments,
    toggleComments,
    engineEnabled,
    toggleEngine,
    engineStatus,
    engineDetail,
    analysis,
    gamesOpen,
    setGamesOpen,
  }
}

export type Viewer = ReturnType<typeof createViewer>
