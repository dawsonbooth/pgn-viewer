import { Show } from 'solid-js'
import { formatScore } from '../engine/uci'
import { btnIcon, btnSmall } from '../ui'
import type { Viewer } from '../viewer-state'

// capped so board + nav fit the viewport height
export const boardWidth =
  'w-[min(100%,calc(100vh-140px))] max-lg:w-[min(100vw,calc(100dvh-300px))] max-lg:min-w-[min(100vw,320px)] ' +
  'max-lg:landscape:min-[600px]:w-[min(100%,calc(100dvh-116px))] max-lg:landscape:min-[600px]:min-w-0'

export function NavBar(props: { viewer: Viewer }) {
  const v = props.viewer
  const c = v.cursor
  const best = () => v.analysis()?.lines[0]

  return (
    <nav
      class={`${boardWidth} grid min-h-13 grid-cols-[auto_1fr_auto] items-center gap-2.5 max-lg:px-2`}
      aria-label="Move navigation"
    >
      <div class="flex gap-1">
        <button
          type="button"
          class={btnIcon}
          onClick={c.first}
          disabled={!c.canPrev()}
          aria-label="First position"
          title="Home"
        >
          ⏮︎
        </button>
        <button
          type="button"
          class={btnIcon}
          onClick={c.prev}
          disabled={!c.canPrev()}
          aria-label="Previous move"
          title="←"
        >
          ◀︎
        </button>
        <button
          type="button"
          class={btnIcon}
          onClick={c.next}
          disabled={!c.canNext()}
          aria-label="Next move"
          title="→"
        >
          ▶︎
        </button>
        <button
          type="button"
          class={btnIcon}
          onClick={c.last}
          disabled={!c.canNext()}
          aria-label="Last main-line position"
          title="End"
        >
          ⏭︎
        </button>
        <button type="button" class={btnIcon} onClick={v.flip} aria-label="Flip board" title="f">
          ⇅︎
        </button>
      </div>
      <output
        class="nav-status flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap"
        aria-live="polite"
      >
        <Show when={c.feedback()} keyed>
          {fb => (
            <>
              <Show when={fb.kind === 'match'}>
                <span class="text-white">✓ {fb.san}</span>
              </Show>
              <Show when={fb.kind === 'revealed'}>
                <span class="text-zinc-400">Revealed: {fb.san}</span>
              </Show>
              <Show when={fb.kind === 'explore'}>
                <span class="text-white">↳ {fb.san}</span>
              </Show>
              <Show when={fb.kind === 'end'}>
                <span class="text-zinc-400">End of line</span>
              </Show>
              <Show when={fb.kind === 'mismatch'}>
                <span class="text-red-400">Not in PGN</span>
                <Show when={!v.showContinuations()}>
                  <button type="button" class={`${btnSmall} max-lg:min-h-9`} onClick={c.reveal}>
                    Reveal
                  </button>
                </Show>
              </Show>
            </>
          )}
        </Show>
        <Show when={c.isExploring()}>
          <span class="text-zinc-400">exploring</span>
          <button
            type="button"
            class={`${btnSmall} max-lg:min-h-9`}
            onClick={c.discard}
            title="Drop the explored moves and return to the PGN"
          >
            Discard
          </button>
        </Show>
        <Show when={!c.feedback() && !v.showContinuations() && !c.atEnd()}>
          <span class="text-zinc-400">Your move</span>
          <button type="button" class={`${btnSmall} max-lg:min-h-9`} onClick={c.reveal}>
            Reveal
          </button>
        </Show>
      </output>
      <div>
        <Show when={v.engineEnabled()}>
          <span class="font-mono font-semibold" title="Engine evaluation">
            {best() ? formatScore(best()!) : '…'}
          </span>
        </Show>
      </div>
    </nav>
  )
}
