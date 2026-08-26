import { parseSquare } from 'chessops'
import {
  batch,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  untrack,
  type Accessor,
} from 'solid-js'
import {
  appendTransientMove,
  discardTransientMoves,
  pathTo,
  prepareGame,
  type GameRecord,
  type MoveNode,
  type PreparedGame,
} from './chess/pgn'

export interface MoveFeedback {
  kind: 'match' | 'mismatch' | 'revealed' | 'end' | 'explore'
  san?: string
}

export type MoveResult =
  | { kind: 'accepted'; san: string }
  | { kind: 'explored'; san: string }
  | { kind: 'rejected' }

export interface CursorOptions {
  // the game being viewed; changing it recalls that game's remembered position
  record: Accessor<GameRecord | undefined>
  // false hides everything after the current move: no forward navigation, no exploring
  showContinuations: Accessor<boolean>
  replyDelay?: number
}

// Where the cursor sits inside one game, tagged with the game so a spot left behind
// is never mistaken for this game's.
interface Spot {
  game: number
  id: number
  // PGN node the exploration branch hangs off, if any
  anchor?: number
}

const DEFAULT_REPLY_DELAY = 350

// Explored moves are remembered as the PGN node they branch from: the branch is
// dropped whenever the tree is rebuilt, the anchor never is.
const anchorOf = (game: PreparedGame | undefined, id: number, anchor: number | undefined) =>
  game?.nodes[id]?.transient ? (anchor ?? 0) : id

// Owns "where am I in this game": the node, the path, which moves are allowed, the
// exploration branch, and where each game was left.
export function createCursor(opts: CursorOptions) {
  const showContinuations = opts.showContinuations
  const replyDelay = opts.replyDelay ?? DEFAULT_REPLY_DELAY

  const [spot, setSpot] = createSignal<Spot>()
  const [visited, setVisited] = createSignal<Record<number, number>>({})
  const [feedback, setFeedback] = createSignal<MoveFeedback>()
  // bumped when an exploration mutates the prepared tree in place
  const [version, setVersion] = createSignal(0)

  const game = createMemo(() => opts.record()?.index ?? -1)
  const built = createMemo(() => {
    const rec = opts.record()
    return rec ? prepareGame(rec) : undefined
  })
  // An exploration mutates the prepared game in place, so a fresh wrapper is published
  // to mark it changed — which is why no version counter has to escape this module.
  // The node array is shared, so node identities (and the board) stay stable.
  const tree = createMemo(() => {
    version()
    const t = built()
    return t && { ...t }
  })

  // A spot belonging to another game — or one whose explored branch was rebuilt away,
  // which is what re-entering a game does — falls back to what that game remembers.
  const here = createMemo<Spot>(() => {
    const g = game()
    const t = tree()
    const s = spot()
    if (s && s.game === g && t?.nodes[s.id]) return s
    const remembered = visited()[g] ?? 0
    return { game: g, id: t?.nodes[remembered] ? remembered : 0 }
  })
  const id = createMemo(() => here().id)
  const node = createMemo(() => tree()?.nodes[id()])
  const fen = () => node()?.fen
  const path = createMemo(() => {
    const t = tree()
    return t ? pathTo(t, id()) : []
  })

  // transient nodes are always appended last, so the tree itself says whether the
  // branch recorded in here() still exists
  const exploringFrom = createMemo(() => {
    const t = tree()
    return t?.nodes[t.nodes.length - 1]?.transient ? here().anchor : undefined
  })
  const isExploring = () => exploringFrom() !== undefined

  const atStart = () => (node()?.parent ?? -1) < 0
  const atEnd = () => !node()?.children.length
  const canPrev = () => !atStart()
  // hidden continuations mean no forward movement at all; reveal() is the way out
  const canNext = () => showContinuations() && !atEnd()

  let replyTimer: ReturnType<typeof setTimeout> | undefined
  const cancelReply = () => {
    if (replyTimer !== undefined) clearTimeout(replyTimer)
    replyTimer = undefined
  }
  onCleanup(cancelReply)

  // The only way the cursor moves: pins the spot to this game and remembers it.
  const place = (target: number, anchor: number | undefined, fb: MoveFeedback | undefined) => {
    cancelReply()
    untrack(() => {
      const g = game()
      const remembered = anchorOf(tree(), target, anchor)
      batch(() => {
        setSpot({ game: g, id: target, anchor })
        setVisited(v => (v[g] === remembered ? v : { ...v, [g]: remembered }))
        setFeedback(fb)
      })
    })
  }

  const goTo = (target: number) => {
    if (!tree()?.nodes[target]) return
    place(target, exploringFrom(), undefined)
  }
  const next = () => {
    const n = node()
    if (n && canNext()) goTo(n.children[0]!)
  }
  const prev = () => {
    const n = node()
    if (n && n.parent >= 0) goTo(n.parent)
  }
  const first = () => goTo(0)
  const last = () => {
    const t = tree()
    // same rule as next(): nothing moves forward while continuations are hidden
    if (!t || !canNext()) return
    goTo(t.mainline[t.mainline.length - 1] ?? 0)
  }

  // steps onto the encoded continuation even while continuations are hidden
  const reveal = () => {
    const t = tree()
    const child = node()?.children[0]
    if (!t || child === undefined) return
    place(child, exploringFrom(), { kind: 'revealed', san: t.nodes[child]!.san })
  }

  const discard = () => {
    const t = tree()
    const anchor = exploringFrom()
    if (!t || anchor === undefined) return
    discardTransientMoves(t)
    batch(() => {
      setVersion(v => v + 1)
      place(anchor, undefined, undefined)
    })
  }

  const reject = (n: MoveNode): MoveResult => {
    setFeedback(n.children.length ? { kind: 'mismatch' } : { kind: 'end' })
    return { kind: 'rejected' }
  }

  // one exploration branch at a time; the PGN itself is never modified
  const explore = (t: PreparedGame, n: MoveNode, orig: string, dest: string): MoveResult => {
    const from = parseSquare(orig)
    const to = parseSquare(dest)
    if (from === undefined || to === undefined) return reject(n)
    const piece = n.pos.board.get(from)
    const promotion = piece?.role === 'pawn' && (to >= 56 || to < 8) ? 'queen' : undefined
    // starting a branch somewhere else drops the previous one
    const restart = isExploring() && !n.transient
    const anchor = restart ? n.id : (exploringFrom() ?? n.id)
    if (restart) discard()
    const added = appendTransientMove(t, n.id, { from, to, promotion })
    if (!added) return reject(n)
    batch(() => {
      setVersion(v => v + 1)
      place(added.id, anchor, { kind: 'explore', san: added.san })
    })
    return { kind: 'explored', san: added.san }
  }

  // with continuations hidden the PGN answers back a beat later
  const scheduleReply = (played: MoveNode) => {
    const reply = played.children[0]
    if (showContinuations() || reply === undefined) return
    const g = game()
    replyTimer = setTimeout(() => {
      replyTimer = undefined
      if (game() !== g || id() !== played.id || showContinuations()) return
      place(reply, exploringFrom(), feedback())
    }, replyDelay)
  }

  const play = (orig: string, dest: string): MoveResult => {
    const t = tree()
    const n = node()
    if (!t || !n) return { kind: 'rejected' }
    const prefix = orig + dest
    const match = n.children
      .map(i => t.nodes[i]!)
      .find(m => m.uci === prefix || m.uci.startsWith(prefix))
    if (!match) return showContinuations() ? explore(t, n, orig, dest) : reject(n)
    place(match.id, exploringFrom(), { kind: 'match', san: match.san })
    scheduleReply(match)
    return { kind: 'accepted', san: match.san }
  }

  // Per-game memory, current game included; only ever holds ids that are in the PGN.
  const positions = createMemo(() => {
    const g = game()
    if (g < 0) return visited()
    return { ...visited(), [g]: anchorOf(tree(), id(), here().anchor) }
  })

  // Seeds the memory from persisted state and forgets where we were.
  const restore = (saved: Record<number, number> = {}) => {
    cancelReply()
    batch(() => {
      setVisited({ ...saved })
      setSpot(undefined)
      setFeedback(undefined)
    })
  }

  // switching games and hiding continuations both end the exploration in progress
  createEffect(
    on(
      [game, showContinuations],
      ([, visible]) => {
        cancelReply()
        if (!visible) discard()
        setFeedback(undefined)
      },
      { defer: true },
    ),
  )

  return {
    tree,
    node,
    id,
    fen,
    path,
    feedback,
    atStart,
    atEnd,
    canPrev,
    canNext,
    isExploring,
    exploringFrom,
    positions,
    goTo,
    next,
    prev,
    first,
    last,
    reveal,
    discard,
    play,
    restore,
  }
}

export type Cursor = ReturnType<typeof createCursor>
