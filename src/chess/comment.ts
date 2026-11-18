import type { SquareName } from 'chessops'
import type { Evaluation } from 'chessops/pgn'
import { parseRichText, type Block } from './richtext'

export type MarkColor = 'green' | 'red' | 'yellow' | 'blue'

// an arrow, or a ring around one square when from === to
export interface Shape {
  from: SquareName
  to: SquareName
  color: MarkColor
}

export interface SquareMark {
  square: SquareName
  color: MarkColor
}

// the chess.com move classifications a lesson can draw on a square
export type Effect = 'brilliant' | 'great' | 'mistake'

export interface EffectMark {
  square: SquareName
  effect: Effect
}

// One PGN comment: its prose, and the commands embedded in it as [%name ...].
export interface Commentary {
  blocks: Block[]
  shapes: Shape[]
  // filled squares: ChessBase, chess.com and Chessable all draw %csl this way
  squares: SquareMark[]
  effects: EffectMark[]
  clock?: number
  evaluation?: Evaluation
  // chess.com lessons: help for finding the move this comment belongs to, and the reply
  // to a move that is not in the PGN
  hint?: string
  wrong?: string
}

const COLORS = new Map<string, MarkColor>([
  ['g', 'green'],
  ['r', 'red'],
  ['y', 'yellow'],
  ['b', 'blue'],
])

// the type names come from the file, so the lookup goes through a Map, not an object
const EFFECTS = new Map<string, Effect>([
  ['brilliant', 'brilliant'],
  ['greatfind', 'great'],
  ['mistake', 'mistake'],
])

const isSquare = (s: string | undefined): s is SquareName => !!s && /^[a-h][1-8]$/.test(s)

// "1:02:03" or "0:00:08.5"
function parseTime(s: string): number | undefined {
  const m = /^(\d+):(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/.exec(s.trim())
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : undefined
}

// "0.17", "-1.5,20" or "#-3"
function parseEval(s: string): Evaluation | undefined {
  const m = /^(?:#([+-]?\d+)|([+-]?(?:\d+\.?\d*|\.\d+)))(?:,(\d+))?$/.exec(s.trim())
  if (!m) return undefined
  const depth = m[3] === undefined ? undefined : Number(m[3])
  return m[1] === undefined ? { pawns: Number(m[2]), depth } : { mate: Number(m[1]), depth }
}

const prose = (s: string) => s.replace(/\s+/g, ' ').trim() || undefined

// chess.com: "e2c4;keyPressed;none;from;e2;to;c4;persistent;true" is an id, then pairs
function chessComFields(args: string): Map<string, string> {
  const parts = args.split(';').map(s => s.trim())
  const fields = new Map([['id', parts[0] ?? '']])
  for (let i = 1; i + 1 < parts.length; i += 2) fields.set(parts[i]!, parts[i + 1]!)
  return fields
}

// A command runs to the closing bracket. Its text never holds another "[", so the search
// from each "[%" ends at the next bracket and the whole scan stays linear.
const COMMAND = /\[%([A-Za-z_]\w{0,40})([^[\]]{0,10000})\]/g

export function parseCommentary(raw: string): Commentary {
  const c: Commentary = { blocks: [], shapes: [], squares: [], effects: [] }

  // "Gd4", "Ge2e4", in lists separated by commas, spaces or both
  const marks = (args: string) => {
    for (const item of args.split(/[\s,]+/)) {
      const m = /^([A-Za-z])([a-h][1-8])([a-h][1-8])?$/.exec(item)
      const color = m && COLORS.get(m[1]!.toLowerCase())
      if (!m || !color) continue
      const from = m[2] as SquareName
      const to = m[3] as SquareName | undefined
      if (to && to !== from) c.shapes.push({ from, to, color })
      else c.squares.push({ square: from, color })
    }
  }

  // chess.com picks a colour by the modifier key held while drawing, and accounts of which
  // key gives which disagree, so every chess.com arrow is drawn in its plain yellow and
  // every highlight in its plain red.
  const commands = new Map<string, (args: string) => void>([
    ['csl', marks],
    ['cal', marks],
    ['clk', a => (c.clock = parseTime(a))],
    ['eval', a => (c.evaluation = parseEval(a))],
    ['hint', a => (c.hint ??= prose(a))],
    ['wrong', a => (c.wrong ??= prose(a))],
    [
      'c_arrow',
      a => {
        const f = chessComFields(a)
        const id = f.get('id')!
        const from = f.get('from') ?? id.slice(0, 2)
        const to = f.get('to') ?? id.slice(2, 4)
        if (isSquare(from) && isSquare(to) && from !== to)
          c.shapes.push({ from, to, color: 'yellow' })
      },
    ],
    [
      'c_highlight',
      a => {
        const f = chessComFields(a)
        const square = f.get('square') ?? f.get('id')
        if (isSquare(square)) c.squares.push({ square, color: 'red' })
      },
    ],
    [
      'c_effect',
      a => {
        const f = chessComFields(a)
        const square = f.get('square') ?? f.get('id')
        const effect = EFFECTS.get(f.get('type')?.toLowerCase() ?? '')
        if (isSquare(square) && effect) c.effects.push({ square, effect })
      },
    ],
  ])

  const text = raw
    // Chessable and chess.com courses escape brackets inside comments
    .replace(/@@StartBracket@@/g, '(')
    .replace(/@@EndBracket@@/g, ')')
    .replace(/@@StartSquare@@/g, '[')
    .replace(/@@EndSquare@@/g, ']')
    // every command is consumed, known or not: %emt, ChessBase's %evp and %mdl, Lichess'
    // %anno, Noctie's %fd…
    .replace(COMMAND, (_, name: string, args: string) => {
      commands.get(name.toLowerCase())?.(args)
      return ' '
    })
    // ChessBase's diagram marker
    .replace(/\[#\]/g, ' ')

  c.blocks = parseRichText(text)
  return c
}
