import { parseBoardFen } from 'chessops/fen'
import { createMemo, For, Show, type JSX } from 'solid-js'
import type { Commentary as Comment } from '../chess/comment'
import type { Block, Span } from '../chess/richtext'
import type { Orientation } from '../viewer-state'

// A position named in a comment (Chessable's @@StartFEN@@), as a small static board in the
// main board's orientation.
function Diagram(props: { fen: string; orientation: Orientation }) {
  const parsed = createMemo(() => {
    const [placement = '', turn] = props.fen.trim().split(/\s+/)
    const board = parseBoardFen(placement)
    return board.isOk ? { board: board.value, turn: turn === 'b' ? 'Black' : 'White' } : undefined
  })
  const pieces = createMemo(() => {
    const p = parsed()
    if (!p) return []
    const flip = props.orientation === 'black'
    return [...p.board].map(([square, piece]) => {
      const file = square % 8
      const rank = Math.floor(square / 8)
      return {
        cls: `${piece.role} ${piece.color}`,
        left: (flip ? 7 - file : file) * 12.5,
        top: (flip ? rank : 7 - rank) * 12.5,
      }
    })
  })
  return (
    <Show
      when={parsed()}
      fallback={<span class="font-mono text-[0.875rem] [overflow-wrap:anywhere]">{props.fen}</span>}
    >
      {p => (
        <figure
          class="diagram cg-wrap mini-board my-2"
          aria-label={`Diagram, ${p().turn} to move`}
          title={props.fen}
        >
          <For each={pieces()}>
            {pc => <piece class={pc.cls} style={{ left: `${pc.left}%`, top: `${pc.top}%` }} />}
          </For>
        </figure>
      )}
    </Show>
  )
}

function SpanView(props: { span: Span; orientation: Orientation }): JSX.Element {
  const s = props.span
  switch (s.kind) {
    case 'break':
      return <br />
    case 'diagram':
      return <Diagram fen={s.fen} orientation={props.orientation} />
    case 'link':
      return (
        <a
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          class="underline decoration-rule-strong underline-offset-2 [overflow-wrap:anywhere] hover:decoration-current"
        >
          {s.text}
        </a>
      )
    case 'text': {
      const italic = s.italic ? <em>{s.text}</em> : s.text
      return s.bold ? <strong class="font-semibold">{italic}</strong> : italic
    }
  }
}

function Spans(props: { spans: Span[]; orientation: Orientation }) {
  return <For each={props.spans}>{s => <SpanView span={s} orientation={props.orientation} />}</For>
}

// Inline, the first paragraph runs on from the move before it and anything after that
// starts a line of its own; as a block, every paragraph does.
function BlockView(props: {
  block: Block
  first: boolean
  inline: boolean
  orientation: Orientation
}) {
  const content = () => <Spans spans={props.block.spans} orientation={props.orientation} />
  switch (props.block.kind) {
    case 'heading':
      return (
        <h2
          class={`text-[1.0625rem] leading-[1.65] font-bold text-ink ${props.first ? '' : 'mt-3'}`}
        >
          {content()}
        </h2>
      )
    case 'quote':
      return (
        <blockquote class="my-2 border-l-2 border-rule-strong pl-3 italic">{content()}</blockquote>
      )
    case 'paragraph':
      return props.inline && props.first ? (
        <span>{content()}</span>
      ) : (
        <div class={props.first ? '' : 'mt-2'}>{content()}</div>
      )
  }
}

export function Commentary(props: {
  comments: Comment[]
  orientation: Orientation
  inline?: boolean
  class?: string
}) {
  const blocks = createMemo(() => props.comments.flatMap(c => c.blocks))
  return (
    <div class={`comment text-ink-2 ${props.inline ? 'inline' : ''} ${props.class ?? ''}`}>
      <For each={blocks()}>
        {(b, i) => (
          <BlockView
            block={b}
            first={i() === 0}
            inline={!!props.inline}
            orientation={props.orientation}
          />
        )}
      </For>
    </div>
  )
}
