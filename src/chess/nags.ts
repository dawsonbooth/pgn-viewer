// Numeric Annotation Glyphs that have a common symbol. Any other number is shown as "$n".

// Move assessments are colour-coded wherever they appear; nothing else is.
export type Tone = 'brilliant' | 'good' | 'interesting' | 'dubious' | 'mistake' | 'blunder'

export interface NagInfo {
  glyph: string
  label: string
  // a move assessment judges the move and sits against the SAN; the rest describe the
  // position or the plans
  kind: 'move' | 'other'
  tone?: Tone
}

const TABLE = new Map<number, NagInfo>()
const set = (nag: number, glyph: string, label: string, kind: NagInfo['kind'], tone?: Tone) =>
  TABLE.set(nag, { glyph, label, kind, tone })
// even = White, odd = Black
const pair = (nag: number, glyph: string, what: string) => {
  set(nag, glyph, `White ${what}`, 'other')
  set(nag + 1, glyph, `Black ${what}`, 'other')
}

set(1, '!', 'Good move', 'move', 'good')
set(2, '?', 'Mistake', 'move', 'mistake')
set(3, '!!', 'Brilliant move', 'move', 'brilliant')
set(4, '??', 'Blunder', 'move', 'blunder')
set(5, '!?', 'Interesting move', 'move', 'interesting')
set(6, '?!', 'Dubious move', 'move', 'dubious')
set(7, '□', 'Only move', 'move')
set(10, '=', 'Equal position', 'other')
set(13, '∞', 'Unclear position', 'other')
set(14, '⩲', 'White is slightly better', 'other')
set(15, '⩱', 'Black is slightly better', 'other')
set(16, '±', 'White is better', 'other')
set(17, '∓', 'Black is better', 'other')
set(18, '+−', 'White is winning', 'other')
set(19, '−+', 'Black is winning', 'other')
pair(22, '⨀', 'is in zugzwang')
pair(32, '↑↑', 'has a lead in development')
pair(36, '↑', 'has the initiative')
pair(40, '→', 'has the attack')
pair(132, '⇆', 'has counterplay')
pair(138, '⨁', 'is in time trouble')
set(140, '∆', 'With the idea', 'other')
set(146, 'N', 'Novelty', 'other')

export const nagInfo = (nag: number): NagInfo =>
  TABLE.get(nag) ?? { glyph: `$${nag}`, label: `Annotation $${nag}`, kind: 'other' }

// Glyphs in reading order: move assessments first, then the rest.
export function nagInfos(nags: readonly number[]): NagInfo[] {
  const infos = nags.map(nagInfo)
  return [...infos.filter(i => i.kind === 'move'), ...infos.filter(i => i.kind !== 'move')]
}

// The move assessment that decides how a move is coloured and badged, if any.
export const moveAssessment = (nags: readonly number[]): NagInfo | undefined =>
  nags.map(nagInfo).find(i => i.kind === 'move')
