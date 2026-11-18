import { describe, expect, it } from 'vitest'
import { moveAssessment, nagInfo, nagInfos } from './nags'

describe('nagInfo', () => {
  it('names the glyphs and says which side', () => {
    expect(nagInfo(3)).toEqual({
      glyph: '!!',
      label: 'Brilliant move',
      kind: 'move',
      tone: 'brilliant',
    })
    expect(nagInfo(14)).toMatchObject({ glyph: '⩲', kind: 'other' })
    expect(nagInfo(37)?.label).toBe('Black has the initiative')
    expect(nagInfo(146)).toMatchObject({ glyph: 'N', label: 'Novelty' })
  })

  it('shows other numbers as they are', () => {
    expect(nagInfo(199)).toEqual({ glyph: '$199', label: 'Annotation $199', kind: 'other' })
  })
})

describe('nagInfos', () => {
  it('puts the move assessment first', () => {
    expect(nagInfos([14, 1]).map(i => i.glyph)).toEqual(['!', '⩲'])
    expect(moveAssessment([14, 4])?.tone).toBe('blunder')
    expect(moveAssessment([7])).toMatchObject({ glyph: '□', tone: undefined })
    expect(moveAssessment([16])).toBeUndefined()
  })
})
