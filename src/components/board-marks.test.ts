import { describe, expect, it } from 'vitest'
import { parsePgnStream, prepareGame, type GameRecord, type PreparedGame } from '../chess/pgn'
import { annotatedPgn } from '../test-utils'
import { boardMarks, destination } from './board-marks'

async function games(pgn: string): Promise<PreparedGame[]> {
  const out: GameRecord[] = []
  await parsePgnStream(pgn, batch => out.push(...batch))
  return out.map(prepareGame)
}

const badges = (marks: ReturnType<typeof boardMarks>) =>
  marks.shapes
    .filter(s => s.customSvg)
    .map(s => [s.orig, /badge-(\w+)/.exec(s.customSvg!.html)![1]])

describe('boardMarks', () => {
  it('draws comment arrows and squares only with comments on', async () => {
    const [lesson] = await games(annotatedPgn)
    const on = boardMarks(lesson!.root, true)
    expect(on.shapes).toEqual([{ orig: 'e1', dest: 'e8', brush: 'yellow' }])
    expect([...on.squares]).toEqual([
      ['e1', 'mark mark-green'],
      ['e8', 'mark mark-green'],
    ])
    const off = boardMarks(lesson!.root, false)
    expect(off.shapes).toEqual([])
    expect(off.squares.size).toBe(0)
  })

  it("badges a move with its glyph, and lets the file's own classification win", async () => {
    const [lesson] = await games(annotatedPgn)
    const qf1 = lesson!.nodes.find(n => n.san === 'Qf1')!
    // a "?" and chess.com's Mistake effect name the same square: one badge
    expect(badges(boardMarks(qf1, true))).toEqual([['f1', 'mistake']])
    // with comments off the effect goes, the glyph stays
    expect(badges(boardMarks(qf1, false))).toEqual([['f1', 'mistake']])
    const qxe8 = lesson!.nodes.find(n => n.san === 'Qxe8')!
    expect(badges(boardMarks(qxe8, true))).toEqual([['e8', 'brilliant']])
    expect(badges(boardMarks(qxe8, false))).toEqual([])
  })

  it('badges castling on the king, not the rook', async () => {
    const [g] = await games('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O!! *')
    const short = g!.nodes.find(n => n.san === 'O-O')!
    expect(destination(short)).toBe('g1')
    expect(badges(boardMarks(short, false))).toEqual([['g1', 'brilliant']])
  })

  it('has nothing to draw for a null move', async () => {
    const [g] = await games('1. e4 $1 -- *')
    const pass = g!.nodes.find(n => n.san === '--')!
    expect(boardMarks(pass, true).shapes).toEqual([])
  })
})
