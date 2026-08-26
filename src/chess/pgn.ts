import { Chess, makeSquare, makeUci, type NormalMove, type Position } from 'chessops'
import { makeFen } from 'chessops/fen'
import {
  PgnParser,
  parseComment,
  startingPosition,
  type ChildNode,
  type Comment,
  type Game,
  type Node,
  type PgnNodeData,
} from 'chessops/pgn'
import { makeSanAndPlay, parseSan } from 'chessops/san'

export interface PgnDocument {
  name: string
  fingerprint: string
  games: GameRecord[]
  complete: boolean
}

export interface GameRecord {
  index: number
  game: Game<PgnNodeData>
  label: string
  parseError?: string
}

export function gameLabel(headers: Map<string, string>, index: number): string {
  const get = (k: string) => {
    const v = headers.get(k)?.trim()
    return v && v !== '?' && v !== '-' ? v : undefined
  }
  const white = get('White')
  const black = get('Black')
  if (white || black) return `${white ?? '?'} – ${black ?? '?'}`
  const event = get('Event')
  if (event) return event
  for (const k of ['Opening', 'Site', 'Annotator', 'Round']) {
    const v = get(k)
    if (v) return v
  }
  return `Game ${index + 1}`
}

// Streams the file through chessops' parser; onGames receives each batch so the
// game list can render before parsing finishes.
export async function parsePgnStream(
  source: Blob | string,
  onGames: (games: GameRecord[], complete: boolean) => void,
  opts: { chunkSize?: number; signal?: AbortSignal } = {},
): Promise<void> {
  const blob = typeof source === 'string' ? new Blob([source]) : source
  let index = 0
  let batch: GameRecord[] = []
  const parser = new PgnParser((game, err) => {
    batch.push({ index, game, label: gameLabel(game.headers, index), parseError: err?.message })
    index++
  })
  const flush = (complete: boolean) => {
    if (batch.length || complete) {
      onGames(batch, complete)
      batch = []
    }
  }

  const reader = blob.stream().pipeThrough(new TextDecoderStream()).getReader()
  try {
    for (;;) {
      if (opts.signal?.aborted) return
      const { value, done } = await reader.read()
      if (done) break
      // chunkSize is only used by tests
      const size = opts.chunkSize ?? value.length
      for (let offset = 0; offset < value.length; offset += size) {
        parser.parse(value.slice(offset, offset + size), { stream: true })
        flush(false)
      }
    }
  } finally {
    reader.releaseLock()
  }
  if (opts.signal?.aborted) return
  parser.parse('', { stream: false })
  flush(true)
}

export interface MoveNode {
  id: number
  parent: number // -1 for the root
  children: number[]
  branch: number
  ply: number // ply of the position *after* this move (root = starting ply)
  san: string
  uci: string
  fen: string
  pos: Position
  check: boolean
  lastMove?: [string, string]
  comments: Comment[]
  startingComments: Comment[]
  nags: number[]
  moveNumber: number
  color: 'white' | 'black'
  error?: string
  // explored by the user; not part of the PGN
  transient?: boolean
}

export interface PreparedGame {
  record: GameRecord
  nodes: MoveNode[]
  root: MoveNode
  mainline: number[]
  setupError?: string
}

const plyOf = (pos: Position) => (pos.fullmoves - 1) * 2 + (pos.turn === 'black' ? 1 : 0)

export function prepareGame(record: GameRecord): PreparedGame {
  const nodes: MoveNode[] = []
  const startRes = startingPosition(record.game.headers)
  let setupError: string | undefined
  let startPos: Position
  if (startRes.isOk) startPos = startRes.value
  else {
    setupError = startRes.error.message
    startPos = Chess.default()
  }
  const root: MoveNode = {
    id: 0,
    parent: -1,
    children: [],
    branch: 0,
    ply: plyOf(startPos),
    san: '',
    uci: '',
    fen: makeFen(startPos.toSetup()),
    pos: startPos,
    check: startPos.isCheck(),
    comments: (record.game.comments ?? []).map(parseComment),
    startingComments: [],
    nags: [],
    moveNumber: startPos.fullmoves,
    color: startPos.turn,
  }
  nodes.push(root)

  const visit = (parent: MoveNode, source: Node<PgnNodeData>) => {
    source.children.forEach((child: ChildNode<PgnNodeData>, branch) => {
      const pos = parent.pos.clone()
      const move = parseSan(pos, child.data.san)
      const node: MoveNode = {
        id: nodes.length,
        parent: parent.id,
        children: [],
        branch,
        ply: parent.ply + 1,
        san: child.data.san,
        uci: '',
        fen: parent.fen,
        pos,
        check: false,
        comments: (child.data.comments ?? []).map(parseComment),
        startingComments: (child.data.startingComments ?? []).map(parseComment),
        nags: child.data.nags ?? [],
        moveNumber: parent.pos.fullmoves,
        color: parent.pos.turn,
      }
      if (move) {
        node.san = makeSanAndPlay(pos, move)
        node.uci = makeUci(move)
        node.fen = makeFen(pos.toSetup())
        node.check = pos.isCheck()
        node.lastMove =
          'from' in move
            ? [makeSquare(move.from), makeSquare(move.to)]
            : [makeSquare(move.to), makeSquare(move.to)]
      } else {
        node.error = `Illegal move: ${child.data.san}`
      }
      nodes.push(node)
      parent.children.push(node.id)
      if (move) visit(node, child)
    })
  }
  visit(root, record.game.moves)

  const mainline: number[] = []
  let cur: MoveNode | undefined = root
  while (cur) {
    mainline.push(cur.id)
    const next: number | undefined = cur.children[0]
    cur = next === undefined ? undefined : nodes[next]
  }
  return { record, nodes, root, mainline, setupError }
}

export function pathTo(game: PreparedGame, id: number): number[] {
  const path: number[] = []
  let cur: MoveNode | undefined = game.nodes[id]
  while (cur) {
    path.push(cur.id)
    cur = cur.parent < 0 ? undefined : game.nodes[cur.parent]
  }
  return path.toReversed()
}

const NAG_GLYPHS: Record<number, string> = {
  1: '!',
  2: '?',
  3: '!!',
  4: '??',
  5: '!?',
  6: '?!',
  7: '□',
  10: '=',
  13: '∞',
  14: '⩲',
  15: '⩱',
  16: '±',
  17: '∓',
  18: '+−',
  19: '−+',
  22: '⨀',
  23: '⨀',
  32: '↑↑',
  33: '↑↑',
  36: '↑',
  37: '↑',
  40: '→',
  41: '→',
  132: '⇆',
  133: '⇆',
  138: '⨁',
  139: '⨁',
  140: '∆',
  146: 'N',
}

export const nagGlyph = (nag: number): string => NAG_GLYPHS[nag] ?? '$' + nag

// Transient nodes are appended at the end of game.nodes, so discarding them is a truncation.
export function appendTransientMove(
  game: PreparedGame,
  parentId: number,
  move: NormalMove,
): MoveNode | undefined {
  const parent = game.nodes[parentId]
  if (!parent || parent.error) return undefined
  const pos = parent.pos.clone()
  if (!pos.isLegal(move)) return undefined
  const san = makeSanAndPlay(pos, move)
  const node: MoveNode = {
    id: game.nodes.length,
    parent: parent.id,
    children: [],
    branch: parent.children.length,
    ply: parent.ply + 1,
    san,
    uci: makeUci(move),
    fen: makeFen(pos.toSetup()),
    pos,
    check: pos.isCheck(),
    lastMove: [makeSquare(move.from), makeSquare(move.to)],
    comments: [],
    startingComments: [],
    nags: [],
    moveNumber: parent.pos.fullmoves,
    color: parent.pos.turn,
    transient: true,
  }
  game.nodes.push(node)
  parent.children.push(node.id)
  return node
}

export function discardTransientMoves(game: PreparedGame): void {
  const first = game.nodes.findIndex(n => n.transient)
  if (first < 0) return
  for (const n of game.nodes) n.children = n.children.filter(id => id < first)
  game.nodes.length = first
}
