import { isMate, type Comment } from 'chessops/pgn'
import { createMemo, For, Show } from 'solid-js'
import { nagGlyph } from '../chess/pgn'
import type { Viewer } from '../viewer-state'

const pill = 'rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400'

export function Commentary(props: { viewer: Viewer }) {
  const v = props.viewer
  const node = () => v.cursor.node()
  const comments = createMemo<Comment[]>(() => node()?.comments ?? [])
  const evaluation = () => comments().find(c => c.evaluation)?.evaluation
  const clock = () => comments().find(c => c.clock !== undefined)?.clock
  const hasText = () => comments().some(c => c.text.trim())

  return (
    <div class="commentary flex flex-col gap-2">
      <Show when={v.showComments()} fallback={<p class="text-zinc-400">Comments hidden.</p>}>
        <Show when={node()?.nags.length}>
          <div class="text-lg font-bold">{node()!.nags.map(nagGlyph).join(' ')}</div>
        </Show>
        <Show
          when={hasText()}
          fallback={<p class="text-zinc-400">No comment for this position.</p>}
        >
          <For each={comments().filter(c => c.text.trim())}>
            {c => <p class="whitespace-pre-wrap">{c.text}</p>}
          </For>
        </Show>
        <Show when={evaluation() || clock() !== undefined}>
          <div class="flex flex-wrap gap-1.5">
            <Show when={evaluation()}>
              {ev => {
                const e = ev()
                return (
                  <span class={pill}>
                    eval {isMate(e) ? `#${e.mate}` : e.pawns.toFixed(2)}
                    {e.depth ? ` (d${e.depth})` : ''}
                  </span>
                )
              }}
            </Show>
            <Show when={clock() !== undefined}>
              <span class={pill}>clock {formatClock(clock()!)}</span>
            </Show>
          </div>
        </Show>
      </Show>
    </div>
  )
}

function formatClock(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
