import { Chess, makeSquare, makeUci, type NormalMove, type Position } from 'chessops'
import { makeFen, parseFen } from 'chessops/fen'
import {
  PgnParser,
  parseVariant,
  startingPosition,
  type ChildNode,
  type Game,
  type Node,
  type PgnNodeData,
} from 'chessops/pgn'
import { makeSanAndPlay, parseSan } from 'chessops/san'
import { opposite } from 'chessops/util'
import { parseCommentary, type Commentary } from './comment'
import { nagInfos } from './nags'

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
  const title = courseTitle(headers) ?? gamePlayers(headers) ?? get('Event')
  if (title) return title
  for (const k of ['Opening', 'Site', 'Annotator', 'Round']) {
    const v = get(k)
    if (v) return v
  }
  return `Game ${index + 1}`
}

// undefined for PGN's unknown placeholders: "?", "-", "????.??.??"
export function headerValue(headers: Map<string, string>, key: string): string | undefined {
  const v = headers.get(key)?.trim()
  return v && !/^[?\-.]*$/.test(v) ? v : undefined
}

// Courses name each game: chess.com lessons in LessonName, Noctie in ElementName.
function courseTitle(headers: Map<string, string>): string | undefined {
  return headerValue(headers, 'LessonName') ?? headerValue(headers, 'ElementName')
}

// "White – Black". A chess.com lesson has no players: its editor writes the step ("4.1",
// "Video 10") where White's name would go.
export function gamePlayers(headers: Map<string, string>): string | undefined {
  if (headerValue(headers, 'LessonName')) return undefined
  const white = headerValue(headers, 'White')
  const black = headerValue(headers, 'Black')
  return white || black ? `${white ?? '?'} – ${black ?? '?'}` : undefined
}

const surname = (name: string | undefined) => name?.split(',')[0]!.trim()

// Compact list label: surnames and place (or event). The year is returned separately so a
// narrow list can truncate the text and still show it. Falls back to the full label, and a
// course's own title always uses it.
export function shortGameLabel(
  headers: Map<string, string>,
  full: string,
): { text: string; year?: string } {
  const get = (k: string) => headerValue(headers, k)
  const year = get('Date')?.match(/^\d{4}/)?.[0]
  const white = surname(get('White'))
  const black = surname(get('Black'))
  if (courseTitle(headers) || (!white && !black)) return { text: full, year }
  const place = get('Site')?.split(',')[0]!.trim() ?? get('Event')
  return { text: `${white ?? '?'} – ${black ?? '?'}${place ? `, ${place}` : ''}`, year }
}

// Games next to each other can share a title, like the steps of a chess.com lesson or the
// lines of a Chessable course. The list tells them apart by their Round.
export function listedRound(games: readonly GameRecord[], index: number): string | undefined {
  const game = games[index]
  const shared = (i: number) => games[i]?.label === game?.label
  if (!game || (!shared(index - 1) && !shared(index + 1))) return undefined
  return headerValue(game.game.headers, 'Round')
}

// chess.com writes some header values HTML-escaped ("Silman&#039;s Lessons"). The
// "&#039;" form is PHP's htmlspecialchars, and these five are all it produces.
const HTML_ESCAPES = new Map([
  ['&amp;', '&'],
  ['&quot;', '"'],
  ['&#039;', "'"],
  ['&lt;', '<'],
  ['&gt;', '>'],
])
const unescapeHtml = (s: string) =>
  s.replace(/&(?:amp|quot|#039|lt|gt);/g, e => HTML_ESCAPES.get(e)!)

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
    for (const [key, value] of game.headers) game.headers.set(key, unescapeHtml(value))
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
  comments: Commentary[]
  startingComments: Commentary[]
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

// "--" in the PGN: the side to move passes, which annotators use to show a threat.
function playNull(pos: Position): void {
  pos.turn = opposite(pos.turn)
  pos.epSquare = undefined
  pos.halfmoves++
  if (pos.turn === 'white') pos.fullmoves++
}

// A pass out of check leaves a king en prise, and a lesson may have no kings at all;
// neither may ever reach the engine.
export const isLegalPosition = (pos: Position): boolean => Chess.fromSetup(pos.toSetup()).isOk

// Lessons set up positions no game could reach, such as a bishop and pawns without kings,
// to show how a piece moves; chess.com sometimes tags them [Variant "illegal"]. chessops
// refuses them, so they are loaded as written.
function teachingPosition(headers: Map<string, string>, error: string): Position | undefined {
  const variant = headers.get('Variant')?.trim().toLowerCase()
  const kingless = error === 'ERR_KINGS' && parseVariant(variant) === 'chess'
  if (variant !== 'illegal' && !kingless) return undefined
  const fen = headers.get('FEN')
  const setup = fen === undefined ? undefined : parseFen(fen)
  if (!setup?.isOk) return undefined
  // what Chess.fromSetup does, minus the validation; brackets reach the protected method
  const pos = Chess.default()
  pos['setupUnchecked'](setup.value)
  return pos
}

export function prepareGame(record: GameRecord): PreparedGame {
  const nodes: MoveNode[] = []
  const headers = record.game.headers
  const startRes = startingPosition(headers)
  let setupError: string | undefined
  let startPos: Position
  if (startRes.isOk) startPos = startRes.value
  else {
    const teaching = teachingPosition(headers, startRes.error.message)
    if (teaching) startPos = teaching
    else {
      setupError = startRes.error.message
      startPos = Chess.default()
    }
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
    comments: (record.game.comments ?? []).map(parseCommentary),
    startingComments: [],
    nags: [],
    moveNumber: startPos.fullmoves,
    color: startPos.turn,
  }
  nodes.push(root)

  const visit = (parent: MoveNode, source: Node<PgnNodeData>) => {
    source.children.forEach((child: ChildNode<PgnNodeData>, branch) => {
      const pos = parent.pos.clone()
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
        comments: (child.data.comments ?? []).map(parseCommentary),
        startingComments: (child.data.startingComments ?? []).map(parseCommentary),
        // "Nf3! $1" names the same glyph twice
        nags: [...new Set(child.data.nags ?? [])],
        moveNumber: parent.pos.fullmoves,
        color: parent.pos.turn,
      }
      // Courses pass even out of check ("15... Bb4+ 16. -- Ra1#") to say any move loses;
      // the PGN is the authority, so the line is kept.
      const move = child.data.san === '--' ? undefined : parseSan(pos, child.data.san)
      if (move) {
        node.san = makeSanAndPlay(pos, move)
        node.uci = makeUci(move)
        node.lastMove =
          'from' in move
            ? [makeSquare(move.from), makeSquare(move.to)]
            : [makeSquare(move.to), makeSquare(move.to)]
      } else if (child.data.san === '--') {
        playNull(pos)
        node.uci = '0000'
      } else {
        node.error = `Illegal move: ${child.data.san}`
      }
      if (!node.error) {
        node.fen = makeFen(pos.toSetup())
        node.check = pos.isCheck()
      }
      nodes.push(node)
      parent.children.push(node.id)
      if (!node.error) visit(node, child)
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

export const moveNumber = (node: MoveNode): string =>
  `${node.moveNumber}${node.color === 'white' ? '.' : '...'}`

// "12. Nf3!", "12... Nf6", or without the number "Nf6"
export function moveText(node: MoveNode, numbered: boolean): string {
  const number = numbered ? `${moveNumber(node)} ` : ''
  return (
    number +
    node.san +
    nagInfos(node.nags)
      .map(i => i.glyph)
      .join('')
  )
}

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
