import { describe, expect, it } from 'vitest'
import { samplePgn as sample } from '../test-utils'
import {
  gameLabel,
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
    expect(g.root.comments[0]?.text).toContain('White to play')
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
