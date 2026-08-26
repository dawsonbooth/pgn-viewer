import { describe, expect, it } from 'vitest'
import { formatScore, parseInfo } from './uci'

describe('parseInfo', () => {
  it("normalises scores to White's perspective", () => {
    const line = 'info depth 20 seldepth 30 multipv 2 score cp -35 nodes 1 nps 1 pv e7e5 g1f3'
    expect(parseInfo(line, 'black')).toEqual({
      multipv: 2,
      depth: 20,
      cp: 35,
      pv: ['e7e5', 'g1f3'],
    })
    expect(parseInfo(line, 'white')?.cp).toBe(-35)
  })

  it('handles mate scores and ignores bound / non-pv lines', () => {
    expect(parseInfo('info depth 5 score mate 3 pv a1a2', 'black')?.mate).toBe(-3)
    expect(parseInfo('info depth 5 score cp 10 lowerbound pv a1a2', 'white')).toBeUndefined()
    expect(parseInfo('info depth 5 currmove e2e4', 'white')).toBeUndefined()
    expect(parseInfo('bestmove e2e4', 'white')).toBeUndefined()
  })
})

describe('formatScore', () => {
  it('formats pawns and mates', () => {
    expect(formatScore({ cp: 35 })).toBe('+0.35')
    expect(formatScore({ cp: -120 })).toBe('-1.20')
    expect(formatScore({ cp: 0 })).toBe('0.00')
    expect(formatScore({ mate: 3 })).toBe('#3')
    expect(formatScore({ mate: -2 })).toBe('#-2')
    expect(formatScore({ mate: 0 })).toBe('#')
  })
})
