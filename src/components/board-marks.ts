import type { DrawShape } from '@lichess-org/chessground/draw'
import type { Key, SquareClasses } from '@lichess-org/chessground/types'
import type { Effect } from '../chess/comment'
import { moveAssessment, type Tone } from '../chess/nags'
import type { MoveNode } from '../chess/pgn'

// What the board shows on top of the position: arrows and badges are drawn as shapes,
// filled squares as classes on chessground's <square> elements.
export interface BoardMarks {
  shapes: DrawShape[]
  squares: SquareClasses
}

interface Badge {
  kind: Tone | 'only'
  glyph: string
}

const EFFECT_BADGES: Record<Effect, Badge> = {
  brilliant: { kind: 'brilliant', glyph: '!!' },
  great: { kind: 'good', glyph: '!' },
  mistake: { kind: 'mistake', glyph: '?' },
}

// □ drawn as a rectangle: the glyph's size and position vary between fonts
const ONLY_MOVE =
  '<rect x="-5.5" y="-5.5" width="11" height="11" fill="none" stroke="#fff" stroke-width="3"/>'

// A disc in the top-right corner of the square. Chessground gives each custom SVG a
// 100-unit box over its square and injects it as markup, so only these fixed strings go
// in. Colours come from the --badge-* tokens.
function badgeSvg(b: Badge): string {
  const content =
    b.kind === 'only'
      ? ONLY_MOVE
      : `<text text-anchor="middle" dominant-baseline="central" font-weight="700" ` +
        (b.glyph.length > 1
          ? `font-size="24" letter-spacing="-1.5" fill="#fff">`
          : `font-size="28" fill="#fff">`) +
        `${b.glyph}</text>`
  return (
    `<g class="badge badge-${b.kind}" transform="translate(80 20)">` +
    `<circle r="19" style="fill:var(--badge-${b.kind})" stroke="#fff" stroke-width="2.5"/>` +
    `${content}</g>`
  )
}

// Where the badge for a move goes: its destination, which for castling is the king's
// square rather than the rook chessops records as the target.
export function destination(node: MoveNode): Key | undefined {
  const [from, to] = node.lastMove ?? []
  if (!from || !to) return undefined
  if (node.san.startsWith('O-O-O')) return `c${from[1]}` as Key
  if (node.san.startsWith('O-O')) return `g${from[1]}` as Key
  return to as Key
}

// Comment marks follow the Comments toggle; the move's own glyph is part of the move and
// is always shown, as it is in the move list.
export function boardMarks(node: MoveNode | undefined, showComments: boolean): BoardMarks {
  const shapes: DrawShape[] = []
  const squares: SquareClasses = new Map()
  if (!node) return { shapes, squares }
  const badges = new Map<Key, Badge>()

  const dest = destination(node)
  const assessment = moveAssessment(node.nags)
  if (dest && assessment)
    badges.set(dest, { kind: assessment.tone ?? 'only', glyph: assessment.glyph })

  if (showComments) {
    for (const c of node.comments) {
      for (const s of c.shapes)
        shapes.push({
          orig: s.from as Key,
          dest: s.from === s.to ? undefined : (s.to as Key),
          brush: s.color,
        })
      for (const s of c.squares) squares.set(s.square as Key, `mark mark-${s.color}`)
      // a classification the file draws itself wins over the glyph on the same square
      for (const e of c.effects) badges.set(e.square as Key, EFFECT_BADGES[e.effect])
    }
  }

  for (const [square, badge] of badges)
    shapes.push({ orig: square, customSvg: { html: badgeSvg(badge) } })
  return { shapes, squares }
}
