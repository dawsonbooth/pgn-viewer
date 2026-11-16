import { For, Show } from 'solid-js'
import { headerValue } from '../chess/pgn'
import type { Viewer } from '../viewer-state'

// Title, then whichever header facts the file has. The result is left out so it can't give
// away a hidden continuation; the move text ends with it when continuations are shown.
export function GameHeader(props: { viewer: Viewer }) {
  const v = props.viewer
  const record = () => v.selectedRecord()

  const facts = () => {
    const r = record()
    if (!r) return []
    const h = (k: string) => headerValue(r.game.headers, k)
    const opening = [h('ECO'), [h('Opening'), h('Variation')].filter(Boolean).join(', ')]
      .filter(Boolean)
      .join(' ')
    const round = h('Round')
    return [
      opening,
      h('Event') !== r.label ? h('Event') : undefined,
      h('Site'),
      // "1992.??.??" → "1992"
      h('Date')?.replace(/\.\?\?/g, ''),
      round ? `Round ${round}` : undefined,
    ].filter((x): x is string => !!x)
  }

  return (
    <Show when={record()}>
      {r => (
        <div class="flex flex-col gap-1">
          <h1 class="text-2xl leading-tight font-bold tracking-[-0.01em] text-balance text-ink">
            {r().label}
          </h1>
          <Show when={facts().length}>
            <ul class="flex flex-wrap gap-x-4 text-[0.9375rem] text-ink-2">
              <For each={facts()}>{fact => <li>{fact}</li>}</For>
            </ul>
          </Show>
        </div>
      )}
    </Show>
  )
}
