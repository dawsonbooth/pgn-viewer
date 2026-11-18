import { createRoot, createSignal } from 'solid-js'
import { describe, expect, it } from 'vitest'
import { parsePgnStream, type GameRecord } from './chess/pgn'
import { createCursor, type Cursor } from './cursor'
import { annotatedPgn, samplePgn } from './test-utils'

const wait = (ms: number) => new Promise(r => setTimeout(r, ms))

// A cursor needs nothing but parsed games: no File, no IndexedDB, no engine.
async function cursorOver(
  replyDelay?: number,
  pgn = samplePgn,
): Promise<{
  c: Cursor
  select: (index: number) => void
  hideContinuations: () => void
  dispose: () => void
}> {
  const games: GameRecord[] = []
  await parsePgnStream(pgn, batch => games.push(...batch))
  return createRoot(dispose => {
    const [index, setIndex] = createSignal(0)
    const [showContinuations, setShowContinuations] = createSignal(true)
    const c = createCursor({ record: () => games[index()], showContinuations, replyDelay })
    return {
      c,
      select: (i: number) => setIndex(i),
      hideContinuations: () => setShowContinuations(false),
      dispose,
    }
  })
}

describe('navigation', () => {
  it('walks the main line and says what is reachable', async () => {
    const { c, dispose } = await cursorOver()
    expect(c.atStart()).toBe(true)
    expect(c.canPrev()).toBe(false)
    expect(c.canNext()).toBe(true)
    c.next()
    expect(c.node()?.san).toBe('Ng5')
    expect(c.path()).toEqual([0, 1])
    c.last()
    expect(c.node()?.san).toBe('Nc3')
    expect(c.atEnd()).toBe(true)
    expect(c.canNext()).toBe(false)
    c.prev()
    expect(c.node()?.san).toBe('Ke6')
    c.first()
    expect(c.atStart()).toBe(true)
    dispose()
  })

  it('ignores an id that is not in the tree', async () => {
    const { c, dispose } = await cursorOver()
    c.next()
    c.goTo(9999)
    expect(c.node()?.san).toBe('Ng5')
    dispose()
  })
})

describe('hidden continuations', () => {
  it('refuses every forward command; reveal is the way on', async () => {
    const { c, hideContinuations, dispose } = await cursorOver()
    c.next()
    const stayed = c.id()
    hideContinuations()
    expect(c.canNext()).toBe(false)
    c.next()
    c.last()
    expect(c.id()).toBe(stayed)
    expect(c.canPrev()).toBe(true)
    c.reveal()
    expect(c.node()?.san).toBe('d5')
    expect(c.feedback()).toEqual({ kind: 'revealed', san: 'd5' })
    dispose()
  })

  it('rejects moves that are not the encoded one instead of exploring', async () => {
    const { c, select, hideContinuations, dispose } = await cursorOver()
    select(1)
    hideContinuations()
    expect(c.play('a2', 'a3')).toEqual({ kind: 'rejected' })
    expect(c.feedback()).toEqual({ kind: 'mismatch' })
    expect(c.isExploring()).toBe(false)
    dispose()
  })

  it('plays the encoded reply back a beat later', async () => {
    const { c, select, hideContinuations, dispose } = await cursorOver(10)
    select(1)
    hideContinuations()
    expect(c.play('e2', 'e4')).toEqual({ kind: 'accepted', san: 'e4' })
    await wait(40)
    expect(c.node()?.san).toBe('e5')
    expect(c.feedback()).toEqual({ kind: 'match', san: 'e4' })
    dispose()
  })

  it('drops a pending reply when the game changes first', async () => {
    const { c, select, hideContinuations, dispose } = await cursorOver(30)
    select(1)
    hideContinuations()
    c.play('e2', 'e4')
    select(0)
    await wait(60)
    expect(c.id()).toBe(0)
    select(1)
    expect(c.node()?.san).toBe('e4')
    dispose()
  })
})

describe('lesson annotations', () => {
  it('offers the hint the PGN gives for the move to find, until a move is made', async () => {
    const { c, hideContinuations, dispose } = await cursorOver(10, annotatedPgn)
    hideContinuations()
    expect(c.hint()).toBe('Trade the queen for two rooks.')
    expect(c.hintShown()).toBe(false)
    c.showHint()
    expect(c.hintShown()).toBe(true)
    // a wrong move leaves the hint up, and the lesson's reply to it is on hand
    c.play('a2', 'a3')
    expect(c.hintShown()).toBe(true)
    expect(c.wrongNote()).toBe('Black is winning. Try again.')
    c.play('e2', 'e8')
    expect(c.hintShown()).toBe(false)
    dispose()
  })

  it("passes on the PGN's verdict when a listed wrong answer is played", async () => {
    const { c, hideContinuations, dispose } = await cursorOver(10, annotatedPgn)
    hideContinuations()
    expect(c.play('e2', 'f1')).toEqual({ kind: 'accepted', san: 'Qf1' })
    expect(c.feedback()).toEqual({ kind: 'match', san: 'Qf1', nags: [2] })
    await wait(40)
    expect(c.node()?.san).toBe('Qxc3')
    dispose()
  })

  it('has no hint where the PGN gives none', async () => {
    const { c, dispose } = await cursorOver()
    c.showHint()
    expect(c.hint()).toBeUndefined()
    expect(c.hintShown()).toBe(false)
    dispose()
  })

  it("takes the first move's hint from the game comment before it", async () => {
    const { c, hideContinuations, dispose } = await cursorOver(
      10,
      '{ Find the fork. [%hint Look at c7.] [%wrong Not quite.] } 1. Nf3 Nf6 *',
    )
    hideContinuations()
    expect(c.hint()).toBe('Look at c7.')
    expect(c.wrongNote()).toBe('Not quite.')
    dispose()
  })

  it('drops a refusal made while the reply was pending, so no reply text leaks', async () => {
    const { c, hideContinuations, dispose } = await cursorOver(
      10,
      '1. e4 e5 2. Nf3 { [%wrong Develop the knight.] } Nc6 *',
    )
    hideContinuations()
    c.play('e2', 'e4')
    expect(c.play('d7', 'd5')).toEqual({ kind: 'rejected' })
    await wait(40)
    expect(c.node()?.san).toBe('e5')
    expect(c.feedback()).toBeUndefined()
    dispose()
  })
})

describe('board moves', () => {
  it('separates a PGN continuation from an exploration and from a refusal', async () => {
    const { c, select, dispose } = await cursorOver()
    select(1)
    expect(c.play('e2', 'e4')).toEqual({ kind: 'accepted', san: 'e4' })
    expect(c.feedback()).toEqual({ kind: 'match', san: 'e4' })
    expect(c.play('a7', 'a6')).toEqual({ kind: 'explored', san: 'a6' })
    c.discard()
    expect(c.play('e2', 'e5')).toEqual({ kind: 'rejected' })
    expect(c.feedback()).toEqual({ kind: 'mismatch' })
    dispose()
  })

  it('promotes to a queen by default', async () => {
    const { c, select, dispose } = await cursorOver()
    select(1)
    const moves: [string, string][] = [
      ['a2', 'a4'],
      ['b7', 'b5'],
      ['a4', 'b5'],
      ['a7', 'a6'],
      ['b5', 'a6'],
      ['h7', 'h6'],
      ['a6', 'a7'],
      ['h6', 'h5'],
      ['a7', 'b8'],
    ]
    for (const [orig, dest] of moves) expect(c.play(orig, dest).kind).toBe('explored')
    expect(c.node()?.san).toBe('axb8=Q')
    dispose()
  })
})

describe('exploration', () => {
  it('hangs a branch off the current node and puts the tree back when it is dropped', async () => {
    const { c, select, dispose } = await cursorOver()
    select(1)
    const before = c.tree()!.nodes.length
    c.play('a2', 'a3')
    expect(c.node()?.transient).toBe(true)
    expect(c.exploringFrom()).toBe(0)
    c.play('e7', 'e5')
    expect(c.tree()!.nodes.length).toBe(before + 2)
    c.prev()
    expect(c.node()?.san).toBe('a3')
    c.discard()
    expect(c.isExploring()).toBe(false)
    expect(c.id()).toBe(0)
    expect(c.tree()!.nodes.length).toBe(before)
    expect(c.tree()!.record.game.moves.children).toHaveLength(1)
    dispose()
  })

  it('keeps only one branch: starting elsewhere drops the previous one', async () => {
    const { c, select, dispose } = await cursorOver()
    select(1)
    const before = c.tree()!.nodes.length
    c.play('a2', 'a3')
    c.first()
    c.play('b2', 'b4')
    expect(c.node()?.san).toBe('b4')
    expect(c.tree()!.nodes.length).toBe(before + 1)
    dispose()
  })

  it('ends when continuations are hidden', async () => {
    const { c, select, hideContinuations, dispose } = await cursorOver()
    select(1)
    c.play('a2', 'a3')
    hideContinuations()
    expect(c.isExploring()).toBe(false)
    expect(c.id()).toBe(0)
    expect(c.tree()!.nodes.every(n => !n.transient)).toBe(true)
    dispose()
  })
})

describe('per-game memory', () => {
  it('remembers where each game was left', async () => {
    const { c, select, dispose } = await cursorOver()
    c.next()
    c.next()
    expect(c.positions()).toEqual({ 0: 2 })
    select(1)
    expect(c.id()).toBe(0)
    c.next()
    select(0)
    expect(c.node()?.san).toBe('d5')
    expect(c.positions()).toEqual({ 0: 2, 1: 1 })
    dispose()
  })

  it('re-enters an explored game on its anchor, not on the root', async () => {
    const { c, select, dispose } = await cursorOver()
    select(1)
    c.next()
    const anchor = c.id()
    c.play('a7', 'a6')
    expect(c.node()?.transient).toBe(true)
    // memory only ever holds PGN nodes, so it survives the tree being rebuilt
    expect(c.positions()[1]).toBe(anchor)
    select(0)
    select(1)
    expect(c.isExploring()).toBe(false)
    expect(c.id()).toBe(anchor)
    expect(c.node()?.san).toBe('e4')
    dispose()
  })

  it('is seeded by restore and forgets where we were', async () => {
    const { c, select, dispose } = await cursorOver()
    c.next()
    c.restore({ 0: 3, 1: 2 })
    expect(c.id()).toBe(3)
    select(1)
    expect(c.node()?.san).toBe('e5')
    dispose()
  })
})
