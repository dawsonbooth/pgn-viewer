// Comment prose as blocks of styled spans. Course sites write their own markup into PGN
// comments: Chessable and chess.com courses use @@Marker@@ pairs and a little HTML, Noctie
// writes Markdown. All of it becomes data here; nothing is ever handed to an HTML parser.

export type Span =
  | { kind: 'text'; text: string; bold?: boolean; italic?: boolean }
  | { kind: 'link'; text: string; href: string }
  | { kind: 'break' }
  // an embedded position, drawn as a small diagram
  | { kind: 'diagram'; fen: string }

export interface Block {
  kind: 'paragraph' | 'heading' | 'quote'
  spans: Span[]
}

interface Style {
  bold?: boolean
  italic?: boolean
}

// LINE SEPARATOR stands for a hard line break: it survives paragraph splitting and
// whitespace collapsing
const BREAK = String.fromCharCode(0x2028)

// Text that carries on the sentence before it: ", although…" after a move, ". This
// chapter" after a parenthetical. "...Nf6" opens a Black move instead.
export const continuesSentence = (text: string) => /^(?:[,;:!?)\]]|\.(?!\.))/.test(text)

const textSpan = (text: string, style: Style): Span => ({
  kind: 'text',
  text,
  ...(style.bold && { bold: true }),
  ...(style.italic && { italic: true }),
})

// only web links are ever made clickable
const link = (href: string, text: string, style: Style): Span[] =>
  /^https?:\/\/\S+$/i.test(href) ? [{ kind: 'link', href, text }] : [textSpan(text, style)]

type Rule = [RegExp, (m: RegExpExecArray, style: Style) => Span[]]

// Earliest match wins; on a tie, the rule listed first. Every pattern is global so it can
// search from a position, and every open-ended span is capped so a stray opener costs a
// bounded scan instead of one to the end of the comment.
const INLINE: Rule[] = [
  [new RegExp(BREAK, 'g'), () => [{ kind: 'break' }]],
  [/@@StartFEN@@\s*([^@]{0,200}?)\s*@@EndFEN@@/g, m => [{ kind: 'diagram', fen: m[1]! }]],
  [/@@LinkStart@@\s*([\s\S]{0,2000}?)\s*@@LinkEnd@@/g, (m, s) => link(m[1]!, m[1]!, s)],
  [/<strong>([\s\S]{0,2000}?)<\/strong>/gi, (m, s) => inline(m[1]!, { ...s, bold: true })],
  // chess.com wraps text in links to its own pages; the text stays
  [/<\/?(?:a|strong)\b[^>]{0,500}>/gi, () => []],
  [/\[([^\]\n]{1,500})\]\((https?:\/\/[^\s)]{1,2000})\)/g, (m, s) => link(m[2]!, m[1]!, s)],
  [
    /\*\*\*(?=\S)([^*]{1,500}?)(?<=\S)\*\*\*/g,
    (m, s) => inline(m[1]!, { ...s, bold: true, italic: true }),
  ],
  [/\*\*(?=\S)([\s\S]{1,1000}?)(?<=\S)\*\*/g, (m, s) => inline(m[1]!, { ...s, bold: true })],
  [
    /(?<![\w*])\*(?=[^\s*])([^*\n]{0,500}?[^\s*])\*(?![\w*])/g,
    (m, s) => inline(m[1]!, { ...s, italic: true }),
  ],
  [
    /(?<![\w_])_(?=[^\s_])([^_\n]{0,500}?[^\s_])_(?![\w_])/g,
    (m, s) => inline(m[1]!, { ...s, italic: true }),
  ],
  [/https?:\/\/[^\s<>"']{0,2000}[^\s<>"'.,;:!?)\]]/gi, (m, s) => link(m[0], m[0], s)],
  // markers this reader has no use for, and the halves of pairs that lost their partner
  [/@@[A-Za-z]{1,40}@@/g, () => []],
]

function inline(source: string, style: Style = {}): Span[] {
  const out: Span[] = []
  // Each rule's next match at or after `at`, so a rule is only searched again once the
  // text it found has been consumed, and never again once it has found nothing.
  const next: (RegExpExecArray | null | undefined)[] = INLINE.map(() => undefined)
  let at = 0
  while (at < source.length) {
    let best = -1
    for (let i = 0; i < INLINE.length; i++) {
      let m = next[i]
      if (m === undefined || (m && m.index < at)) {
        const re = INLINE[i]![0]
        re.lastIndex = at
        m = next[i] = re.exec(source)
      }
      if (m && (best < 0 || m.index < next[best]!.index)) best = i
    }
    if (best < 0) {
      out.push(textSpan(source.slice(at), style))
      break
    }
    const m = next[best]!
    if (m.index > at) out.push(textSpan(source.slice(at, m.index), style))
    out.push(...INLINE[best]![1](m, style))
    at = m.index + m[0].length
  }
  return out
}

// Joins neighbouring text of one style, collapses the gaps left by removed markup and trims
// the ends of the block and of each line.
function tidy(spans: Span[]): Span[] {
  const out: Span[] = []
  for (const span of spans) {
    const prev = out.at(-1)
    if (span.kind !== 'text') {
      if (span.kind === 'break' && prev?.kind === 'text') prev.text = prev.text.trimEnd()
      out.push(span)
      continue
    }
    let text = span.text.replace(/ {2,}/g, ' ')
    const after = !prev || prev.kind === 'break' || prev.kind === 'diagram'
    if (after || (prev.kind === 'text' && prev.text.endsWith(' '))) text = text.trimStart()
    if (!text) continue
    if (prev?.kind === 'text' && !prev.bold === !span.bold && !prev.italic === !span.italic)
      prev.text += text
    else out.push({ ...span, text })
  }
  const last = out.at(-1)
  if (last?.kind === 'text') last.text = last.text.trimEnd()
  return out.filter(s => s.kind !== 'text' || s.text)
}

// Lines that start a list item keep their line break; any other single newline is a hard
// wrap from the exporter. "1. e4" at the start of a wrapped line is a move, not a list.
// The bullets are the ones course authors use, emoji included.
const LIST_ITEM =
  /^(?:[-*•●·➢➤▷—]\s|\d{1,2}[.)]\s+(?![KQRBN]?[a-h]?[1-8]?x?[a-h][1-8]|O-O)|[a-z]\)\s|\p{Extended_Pictographic})/u

// Trailing spaces are left to the collapsing below: a pattern anchored at the end of a
// line costs quadratic time on a long run of spaces inside it.
function joinLines(paragraph: string): string {
  return paragraph
    .split('\n')
    .map(l => l.replace(/^[ \t]+/, ''))
    .filter(l => l && !l.startsWith('```'))
    .map((l, i) => {
      // Markdown bullets read better as real ones
      const line = l.replace(/^[-*]\s+/, '• ')
      return i === 0 ? line : (LIST_ITEM.test(l) ? BREAK : ' ') + line
    })
    .join('')
    .replace(/[ \t\f\v]+/g, ' ')
    .trim()
}

const closesAtEnd = (p: string) => {
  let depth = 0
  for (let i = 0; i < p.length; i++) {
    if (p[i] === '(') depth++
    else if (p[i] === ')' && --depth === 0) return i === p.length - 1
  }
  return false
}

// Some exports lift every parenthetical onto a paragraph of its own: "find the bishop
// move\n\n(s)\n\n. This chapter". Put them back into the sentence they came from.
// Paragraphs are gathered as pieces and joined once, so a long chain stays linear.
function rejoin(paragraphs: string[]): string[] {
  const out: string[][] = []
  let absorbed = false
  for (const p of paragraphs) {
    const prev = out.at(-1)
    const ended = /[.!?:]/.test(prev?.at(-1)?.at(-1) ?? '')
    if (prev && p.startsWith('(') && closesAtEnd(p) && !ended) {
      prev.push(' ', p)
      absorbed = true
    } else if (prev && continuesSentence(p)) {
      prev.push(p)
      absorbed = false
    } else if (prev && absorbed && /^[a-z]/.test(p)) {
      prev.push(' ', p)
      absorbed = false
    } else {
      out.push([p])
      absorbed = false
    }
  }
  return out.map(pieces => pieces.join(''))
}

function flow(source: string): Block[] {
  const blocks: Block[] = []
  let run: string[] = []
  const flush = () => {
    for (const p of rejoin(run)) {
      const spans = tidy(inline(p))
      if (spans.length) blocks.push({ kind: 'paragraph', spans })
    }
    run = []
  }
  for (const paragraph of source.split(/\n[ \t]*\n/)) {
    // a Markdown heading or rule can sit on any line of a paragraph
    let lines: string[] = []
    const take = () => {
      const p = joinLines(lines.join('\n'))
      if (p) run.push(p)
      lines = []
    }
    for (const line of paragraph.split('\n')) {
      const heading = /^\s{0,3}#{1,6}\s+(\S.*)$/.exec(line)
      if (heading) {
        take()
        flush()
        const spans = tidy(inline(heading[1]!))
        if (spans.length) blocks.push({ kind: 'heading', spans })
      } else if (/^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) take()
      else lines.push(line)
    }
    take()
  }
  flush()
  return blocks
}

export function parseRichText(source: string): Block[] {
  const text = source
    .replace(/\r\n?/g, '\n')
    .replace(/<br\s*\/?>/gi, BREAK)
    .replace(new RegExp(`(?:${BREAK}\\s*){2,}`, 'g'), '\n\n')
  const blocks: Block[] = []
  const marker =
    /@@HeaderStart@@([\s\S]{0,1000}?)@@HeaderEnd@@|@@StartBlockQuote@@([\s\S]{0,5000}?)@@EndBlockQuote@@/g
  let at = 0
  let m: RegExpExecArray | null
  while ((m = marker.exec(text))) {
    blocks.push(...flow(text.slice(at, m.index)))
    at = m.index + m[0].length
    if (m[1] !== undefined) {
      const spans = tidy(inline(joinLines(m[1].replace(/\n+/g, ' '))))
      if (spans.length) blocks.push({ kind: 'heading', spans })
    } else {
      // a quote is one block; its paragraphs are kept apart by a blank line
      const spans: Span[] = []
      for (const b of flow(m[2]!)) {
        if (spans.length) spans.push({ kind: 'break' }, { kind: 'break' })
        spans.push(...b.spans)
      }
      if (spans.length) blocks.push({ kind: 'quote', spans })
    }
  }
  blocks.push(...flow(text.slice(at)))
  return blocks
}
