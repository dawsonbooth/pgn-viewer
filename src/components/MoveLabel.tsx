import { For } from 'solid-js'
import { nagInfos, type NagInfo, type Tone } from '../chess/nags'
import { moveNumber, type MoveNode } from '../chess/pgn'

// whole class strings, so Tailwind finds them
const TONE: Record<Tone, string> = {
  brilliant: 'text-glyph-brilliant',
  good: 'text-glyph-good',
  interesting: 'text-glyph-interesting',
  dubious: 'text-glyph-dubious',
  mistake: 'text-glyph-mistake',
  blunder: 'text-glyph-blunder',
}

export const toneClass = (tone: Tone | undefined) => (tone ? TONE[tone] : '')

// "12. Nf3, good move": what a screen reader should say instead of "Nf3 exclamation mark"
export function spokenMove(node: MoveNode, numbered: boolean): string {
  const glyphs = nagInfos(node.nags)
  const move = `${numbered ? `${moveNumber(node)} ` : ''}${node.san}`
  return glyphs.length ? `${move}, ${glyphs.map(g => g.label.toLowerCase()).join(', ')}` : move
}

// "12. Nf3!" with the glyphs marked up. Its text is exactly moveText(): move assessments
// against the SAN in their colour, other glyphs after a little space in ink. Over the
// current-move chip everything takes the chip's ink.
export function MoveLabel(props: { node: MoveNode; numbered: boolean; plain?: boolean }) {
  const glyphs = () => nagInfos(props.node.nags)
  const cls = (g: NagInfo) =>
    g.kind === 'move'
      ? `glyph font-bold ${props.plain ? '' : toneClass(g.tone)}`
      : 'glyph ml-0.5 font-normal'
  return (
    <>
      {props.numbered ? `${moveNumber(props.node)} ` : ''}
      {props.node.san}
      <For each={glyphs()}>
        {g => (
          <span class={cls(g)} title={g.label}>
            {g.glyph}
          </span>
        )}
      </For>
    </>
  )
}
