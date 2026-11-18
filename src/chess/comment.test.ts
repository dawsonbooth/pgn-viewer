import { describe, expect, it } from 'vitest'
import { plainText } from '../test-utils'
import { parseCommentary } from './comment'

const text = (raw: string) => plainText(parseCommentary(raw).blocks)

describe('board marks', () => {
  it('reads %csl as filled squares and %cal as arrows, however they are spaced', () => {
    const c = parseCommentary('[%csl Gg8, Rf7,Yd4] [%cal Ge2e4,Bd1h5] [%csl Ge2e4] text')
    expect(c.squares).toEqual([
      { square: 'g8', color: 'green' },
      { square: 'f7', color: 'red' },
      { square: 'd4', color: 'yellow' },
    ])
    expect(c.shapes).toEqual([
      { from: 'e2', to: 'e4', color: 'green' },
      { from: 'd1', to: 'h5', color: 'blue' },
      { from: 'e2', to: 'e4', color: 'green' },
    ])
    expect(plainText(c.blocks)).toBe('text')
  })

  it("reads chess.com's arrows, highlights and effects, even wrapped over lines", () => {
    const c = parseCommentary(
      '[%c_arrow\ne2c4;keyPressed;none;from;e2;opacity;0.8;to;c4;persistent;true]' +
        '[%c_highlight\ne4;keyPressed;none;opacity;0.8;square;e4;persistent;true]' +
        '[%c_effect e8;square;e8;type;GreatFind;persistent;true]' +
        '[%c_effect f1;square;f1;type;SomethingElse;persistent;true] White should attack.',
    )
    expect(c.shapes).toEqual([{ from: 'e2', to: 'c4', color: 'yellow' }])
    expect(c.squares).toEqual([{ square: 'e4', color: 'red' }])
    expect(c.effects).toEqual([{ square: 'e8', effect: 'great' }])
    expect(plainText(c.blocks)).toBe('White should attack.')
  })

  it('ignores keys that only exist on Object.prototype', () => {
    const c = parseCommentary('[%__proto__ x] [%constructor y] [%c_effect e4;type;toString]')
    expect(c.effects).toEqual([])
    expect(c.blocks).toEqual([])
  })
})

describe('clocks and evaluations', () => {
  it('reads %clk and %eval', () => {
    const c = parseCommentary('[%clk 1:02:03.5] [%eval -1.25,22]')
    expect(c.clock).toBe(3723.5)
    expect(c.evaluation).toEqual({ pawns: -1.25, depth: 22 })
    expect(parseCommentary('[%eval #-3]').evaluation).toEqual({ mate: -3, depth: undefined })
  })
})

describe('training text', () => {
  it('takes %hint and %wrong out of the prose', () => {
    const c = parseCommentary(
      "[%wrong There's a better\nmove.] [%hint Don't miss the rook.] Great job!",
    )
    expect(c.wrong).toBe("There's a better move.")
    expect(c.hint).toBe("Don't miss the rook.")
    expect(plainText(c.blocks)).toBe('Great job!')
  })

  it('keeps a hint with a stray quote in it', () => {
    const c = parseCommentary(`[%hint "C6' is falling.] Next`)
    expect(c.hint).toBe(`"C6' is falling.`)
    expect(plainText(c.blocks)).toBe('Next')
  })
})

describe('everything else', () => {
  it('consumes unknown commands and ChessBase diagram markers', () => {
    expect(
      text('[%evp 0,4,-10,-124] [%mdl 4096] [%anno "FM calcu_later", calcu_later] [#] Endgame'),
    ).toBe('Endgame')
  })

  it('unescapes Chessable brackets, including commands written with them', () => {
    expect(
      text(
        'Carlsen @@StartBracket@@2847@@EndBracket@@ @@StartSquare@@%emt 0:00:02@@EndSquare@@ @@StartSquare@@#@@EndSquare@@ won',
      ),
    ).toBe('Carlsen (2847) won')
  })

  it('takes linear time on pathological comments', () => {
    // a pattern that rescans the rest of the comment from every opener, line position or
    // paragraph takes seconds on each of these
    const inputs = [
      '[%a '.repeat(40000) + ']',
      'x' + ' '.repeat(80000) + 'y',
      '# x' + ' '.repeat(80000) + 'y',
      'a' + '\n\n(x)'.repeat(40000),
      '**a '.repeat(10000),
      '<strong>x '.repeat(8000) + '@@LinkStart@@ '.repeat(3000),
      'word **bold** [link](https://x.org/a) _it_ '.repeat(2000),
    ]
    const started = performance.now()
    for (const s of inputs) parseCommentary(s)
    // generous: the bound is there to catch quadratic time, not to measure
    expect(performance.now() - started).toBeLessThan(1000)
  })

  it('keeps a diagram with no words around it', () => {
    const c = parseCommentary('@@StartFEN@@8/8/8/8/8/8/5PPb/5K2 w - - 0 1@@EndFEN@@')
    expect(c.blocks.flatMap(b => b.spans)).toEqual([
      { kind: 'diagram', fen: '8/8/8/8/8/8/5PPb/5K2 w - - 0 1' },
    ])
    expect(parseCommentary('[%eval 0.12]').blocks).toEqual([])
  })
})
