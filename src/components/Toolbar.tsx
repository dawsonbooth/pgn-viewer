import { Show } from 'solid-js'
import { pickPgnFile } from '../files/open'
import { btn, toggle } from '../ui'
import type { Viewer } from '../viewer-state'

export function Toolbar(props: { viewer: Viewer }) {
  const v = props.viewer
  const open = async () => {
    const file = await pickPgnFile()
    if (file) void v.openFile(file)
  }
  return (
    <header class="toolbar flex h-12 shrink-0 items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-900 px-2.5">
      <div class="flex min-w-0 items-center gap-2">
        <button type="button" class={btn} onClick={open}>
          Open PGN
        </button>
        <span class="filename truncate text-zinc-400" title={v.doc()?.name}>
          {v.doc()?.name ?? 'No file open'}
        </span>
      </div>
      <div class="flex min-w-0 items-center gap-2">
        <div class="max-lg:hidden">
          <Toggles viewer={v} />
        </div>
        <button
          type="button"
          class={`mobile-only ${btn} lg:hidden`}
          aria-haspopup="dialog"
          aria-expanded={v.gamesOpen()}
          onClick={() => v.setGamesOpen(true)}
          disabled={!v.games().length}
        >
          Games
          <Show when={v.games().length}>
            {' '}
            ({v.selectedIndex() + 1}/{v.games().length})
          </Show>
        </button>
      </div>
    </header>
  )
}

export function Toggles(props: { viewer: Viewer }) {
  const v = props.viewer
  return (
    <fieldset class="flex min-w-0 gap-1.5 border-0 p-0" aria-label="Visibility">
      <button
        type="button"
        class={toggle}
        aria-pressed={v.showContinuations()}
        onClick={v.toggleContinuations}
        title="Show moves after the current position (v)"
      >
        Continuations
      </button>
      <button
        type="button"
        class={toggle}
        aria-pressed={v.showComments()}
        onClick={v.toggleComments}
        title="Show PGN comments (c)"
      >
        Comments
      </button>
      <button
        type="button"
        class={toggle}
        aria-pressed={v.engineEnabled()}
        onClick={v.toggleEngine}
        title="Local Stockfish analysis (e)"
      >
        Engine
      </button>
    </fieldset>
  )
}
