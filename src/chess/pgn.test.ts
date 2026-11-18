import { describe, expect, it } from 'vitest'
import { annotatedPgn, plainText, samplePgn as sample } from '../test-utils'
import {
  gameLabel,
  gamePlayers,
  isLegalPosition,
  listedRound,
  moveText,
  parsePgnStream,
  pathTo,
  prepareGame,
  shortGameLabel,
  type GameRecord,
} from './pgn'

async function parseAll(text: string | Blob): Promise<GameRecord[]> {
  const out: GameRecord[] = []
  await parsePgnStream(text, games => out.push(...games))
  return out
}

describe('parsePgnStream', () => {
  it('keeps source game order and labels games from headers', async () => {
    const games = await parseAll(sample)
    expect(games.map(g => g.label)).toEqual([
      'Fork exercise',
      'Fischer, Robert J. – Spassky, Boris V.',
      'Broken',
    ])
    expect(games.map(g => g.index)).toEqual([0, 1, 2])
  })

  it('parses from a File stream in small chunks with identical results', async () => {
    const file = new File([sample], 'sample.pgn')
    const streamed = await parsePgnStream(file, () => {}, { chunkSize: 64 }).then(() =>
      parseAll(file),
    )
    const direct = await parseAll(sample)
    expect(streamed.map(g => g.label)).toEqual(direct.map(g => g.label))
    expect(streamed[1]!.game.moves.children.length).toBe(1)
  })

  it('emits games progressively for large inputs', async () => {
    const big = Array.from({ length: 500 }, (_, i) => `[Event "P${i}"]\n\n1. e4 *\n`).join('\n')
    const batches: number[] = []
    let completedAt = -1
    await parsePgnStream(
      new Blob([big]),
      (games, complete) => {
        batches.push(games.length)
        if (complete) completedAt = batches.length
      },
      { chunkSize: 1024 },
    )
    expect(batches.length).toBeGreaterThan(1)
    expect(completedAt).toBe(batches.length)
    expect(batches.reduce((a, b) => a + b, 0)).toBe(500)
  })

  it("decodes the HTML escapes in chess.com's headers", async () => {
    const [lesson] = await parseAll(
      '[Event "Silman&#039;s Lessons &amp; &quot;Strategy&quot; - Chess Lessons"]\n' +
        '[LessonName "Good & Bad Pieces"]\n\n*',
    )
    expect(lesson!.game.headers.get('Event')).toBe(`Silman's Lessons & "Strategy" - Chess Lessons`)
    expect(lesson!.label).toBe('Good & Bad Pieces')
  })

  it('handles an empty file', async () => {
    let complete = false
    await parsePgnStream(new Blob([]), (games, done) => {
      expect(games).toEqual([])
      complete = done
    })
    expect(complete).toBe(true)
  })
})

const h = (o: Record<string, string>) => new Map(Object.entries(o))

describe('gameLabel', () => {
  it('prefers players, then event, then ordinal', () => {
    expect(gameLabel(h({ White: 'A', Black: 'B', Event: 'E' }), 0)).toBe('A – B')
    expect(gameLabel(h({ White: '?', Black: '?', Event: 'Fork' }), 0)).toBe('Fork')
    expect(gameLabel(h({}), 480)).toBe('Game 481')
  })

  it("uses a chess.com lesson's own name over step numbers and the course", () => {
    const lesson = h({
      Event: 'Play the Tarrasch Defense - Chess Lessons',
      White: '4.1',
      Black: '?',
      LessonName: 'Lines With e3',
    })
    expect(gameLabel(lesson, 0)).toBe('Lines With e3')
  })

  it("uses a Noctie element's name over the players and the theme", () => {
    const element = h({
      Event: 'How to Win Winning Positions',
      White: 'Caruana, Fabiano',
      Black: 'So, Wesley',
      ElementName: 'Avoiding Slip-Ups #6',
    })
    expect(gameLabel(element, 0)).toBe('Avoiding Slip-Ups #6')
  })
})

describe('gamePlayers', () => {
  it('names the players, except in a chess.com lesson', () => {
    expect(gamePlayers(h({ White: 'Caruana, Fabiano', Black: '?' }))).toBe('Caruana, Fabiano – ?')
    const lesson = h({ White: 'Video 10', Black: '?', LessonName: 'Fianchetto' })
    expect(gamePlayers(lesson)).toBeUndefined()
    expect(gamePlayers(h({ White: '?', Black: '-', Event: 'Fork' }))).toBeUndefined()
  })
})

describe('listedRound', () => {
  it('gives the Round of games next to others with the same title', async () => {
    const games = await parseAll(
      [
        ['Opposition', '1'],
        ['Key Squares', '1'],
        ['Key Squares', '2'],
        ['Triangulation', '1'],
        ['Fork', '?'],
        ['Fork', '?'],
      ]
        .map(([event, round]) => `[Event "${event}"]\n[Round "${round}"]\n\n*\n`)
        .join('\n'),
    )
    expect(games.map(g => listedRound(games, g.index))).toEqual([
      undefined,
      '1',
      '2',
      undefined,
      undefined,
      undefined,
    ])
    expect(listedRound(games, 6)).toBeUndefined()
  })
})

describe('shortGameLabel', () => {
  it('uses surnames, place and year, and falls back to the full label', () => {
    const fischer = h({
      White: 'Fischer, Robert J.',
      Black: 'Spassky, Boris V.',
      Site: 'Belgrade, Serbia JUG',
      Date: '1992.11.04',
    })
    expect(shortGameLabel(fischer, 'full')).toEqual({
      text: 'Fischer – Spassky, Belgrade',
      year: '1992',
    })
    expect(
      shortGameLabel(h({ White: 'Carlsen', Black: 'Nakamura', Date: '????.??.??' }), 'x'),
    ).toEqual({ text: 'Carlsen – Nakamura', year: undefined })
    expect(shortGameLabel(h({ White: '?', Black: '?', Event: 'Fork' }), 'Fork')).toEqual({
      text: 'Fork',
      year: undefined,
    })
    const lesson = h({
      White: 'Video 10',
      LessonName: "Learn the King's Indian",
      Date: '2021.05.03',
    })
    expect(shortGameLabel(lesson, "Learn the King's Indian")).toEqual({
      text: "Learn the King's Indian",
      year: '2021',
    })
    const element = h({ White: 'Caruana, Fabiano', Black: 'So, Wesley', ElementName: 'Slip-Ups' })
    expect(shortGameLabel(element, 'Slip-Ups')).toEqual({ text: 'Slip-Ups', year: undefined })
  })
})

describe('prepareGame', () => {
  it('materialises positions, variations and comments from a FEN start', async () => {
    const [fork] = await parseAll(sample)
    const g = prepareGame(fork!)
    expect(g.setupError).toBeUndefined()
    expect(g.root.fen.startsWith('r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w')).toBe(
      true,
    )
    expect(plainText(g.root.comments[0]!.blocks)).toContain('White to play')
    expect(g.mainline.length).toBe(10)
    const branch = g.nodes.find(n => n.children.length > 1)!
    expect(branch.san).toBe('exd5')
    expect(branch.children.map(id => g.nodes[id]!.san)).toEqual(['Nxd5', 'Na5'])
    const nxf7 = g.nodes.find(n => n.san === 'Nxf7')!
    expect(nxf7.nags).toEqual([1])
    expect(moveText(nxf7, true)).toBe('6. Nxf7!')
    expect(moveText(nxf7, false)).toBe('Nxf7!')
    expect(nxf7.uci).toBe('g5f7')
    expect(nxf7.comments[0]?.shapes).toHaveLength(1)
    expect(pathTo(g, nxf7.id).map(id => g.nodes[id]!.san)).toEqual([
      '',
      'Ng5',
      'd5',
      'exd5',
      'Nxd5',
      'Nxf7',
    ])
  })

  it('numbers moves and detects check', async () => {
    const games = await parseAll(sample)
    const g = prepareGame(games[2]!)
    const last = g.nodes[g.mainline.at(-1)!]!
    expect(last.san).toBe('Qxf7#')
    expect(last.moveNumber).toBe(4)
    expect(last.color).toBe('white')
    expect(last.check).toBe(true)
  })

  it('flags illegal SAN without throwing', async () => {
    const [rec] = await parseAll('[Event "x"]\n\n1. e4 e5 2. Ke3 *')
    const g = prepareGame(rec!)
    const bad = g.nodes.find(n => n.error)
    expect(bad?.san).toBe('Ke3')
    expect(bad?.error).toContain('Illegal move')
  })
})

describe('annotations', () => {
  it('parses comment commands and keeps them out of the text', async () => {
    const [lesson] = await parseAll(annotatedPgn)
    const g = prepareGame(lesson!)
    expect(plainText(g.root.comments[0]!.blocks)).toBe('How can White gain an advantage?')
    expect(g.root.comments[0]?.squares).toHaveLength(2)
    const qxe8 = g.nodes[g.mainline[1]!]!
    expect(qxe8.comments[0]).toMatchObject({
      blocks: [],
      hint: 'Trade the queen for two rooks.',
      wrong: 'Black is winning. Try again.',
      effects: [{ square: 'e8', effect: 'brilliant' }],
    })
    expect(g.nodes.find(n => n.san === 'Qf1')?.nags).toEqual([2])
  })

  it('writes move glyphs against the SAN and drops repeats', async () => {
    const [rec] = await parseAll('1. e4! $1 e5 $14 $6 *')
    const g = prepareGame(rec!)
    const [, e4, e5] = g.mainline.map(id => g.nodes[id]!)
    expect(e4!.nags).toEqual([1])
    expect(moveText(e4!, true)).toBe('1. e4!')
    expect(moveText(e5!, false)).toBe('e5?!⩲')
  })
})

describe('null moves', () => {
  it('passes the turn and carries on with the line', async () => {
    const [rec] = await parseAll('1. e4 -- 2. d4 Z0 3. c4 *')
    const g = prepareGame(rec!)
    const line = g.mainline.map(id => g.nodes[id]!)
    expect(line.map(n => n.san)).toEqual(['', 'e4', '--', 'd4', '--', 'c4'])
    expect(line.every(n => !n.error)).toBe(true)
    const pass = line[2]!
    expect(pass.uci).toBe('0000')
    expect(pass.lastMove).toBeUndefined()
    expect(pass.fen).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2')
    expect(moveText(pass, true)).toBe('1... --')
    expect(moveText(line[3]!, true)).toBe('2. d4')
  })

  it('allows a pass out of check, but marks the position as unfit for an engine', async () => {
    const [rec] = await parseAll('1. e4 f5 2. Qh5+ -- 3. Nf3 *')
    const g = prepareGame(rec!)
    const pass = g.nodes.find(n => n.san === '--')!
    expect(pass.error).toBeUndefined()
    expect(isLegalPosition(pass.pos)).toBe(false)
    expect(isLegalPosition(g.nodes[pass.parent]!.pos)).toBe(true)
    // the queen still gives check
    expect(g.nodes.at(-1)!.san).toBe('Nf3+')
  })
})

describe('teaching positions', () => {
  it('loads a lesson position without kings as written', async () => {
    const [, , bishop] = await parseAll(annotatedPgn)
    const g = prepareGame(bishop!)
    expect(g.setupError).toBeUndefined()
    expect(g.root.fen.startsWith('8/8/8/8/8/8/5PPb/5K2 w')).toBe(true)
    expect(g.mainline.map(id => g.nodes[id]!.san)).toEqual(['', 'g3', '--', 'Kg2'])
    expect(isLegalPosition(g.root.pos)).toBe(false)
  })

  it('keeps the en passant square a lesson sets up', async () => {
    const [rec] = await parseAll('[FEN "8/8/8/3pP3/8/8/8/8 w - d6 0 2"]\n\n1. exd6 *')
    const g = prepareGame(rec!)
    expect(g.root.fen).toBe('8/8/8/3pP3/8/8/8/8 w - d6 0 2')
    expect(g.nodes[1]!.san).toBe('exd6')
    expect(g.nodes[1]!.error).toBeUndefined()
  })

  it('still refuses what is not a position at all', async () => {
    const games = await parseAll(
      '[FEN "8/8/8/8/8/8/8/8 w - - 0 1"]\n\n*\n\n[Variant "Atomic"]\n[FEN "8/8/8/8/8/8/5PPb/5K2 w - - 0 1"]\n\n*',
    )
    expect(games.map(r => prepareGame(r).setupError)).toEqual(['ERR_EMPTY', 'ERR_KINGS'])
  })
})
