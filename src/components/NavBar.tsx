import { isMate } from 'chessops/pgn'
import { createMemo, For, Show } from 'solid-js'
import { moveText } from '../chess/pgn'
import { formatScore } from '../engine/uci'
import { btnIcon, btnSmall } from '../ui'
import type { Viewer } from '../viewer-state'
import { IconCheck, IconFirst, IconFlip, IconLast, IconNext, IconPrev } from './icons'

// capped so board + nav fit the viewport height
export const boardWidth =
  'w-[min(100%,calc(100vh-140px))] max-lg:w-[min(100vw,calc(100dvh-280px),64dvh)] max-lg:min-w-[min(100vw,320px)] ' +
  'max-lg:portrait:min-[700px]:w-[min(100vw,calc(100dvh-280px),52dvh)] ' +
  'max-lg:landscape:min-[600px]:w-[min(100%,calc(100dvh-116px))] max-lg:landscape:min-[600px]:min-w-0'

function formatClock(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function NavBar(props: { viewer: Viewer }) {
  const v = props.viewer
  const c = v.cursor
  const best = () => v.analysis()?.lines[0]

  const position = () => {
    const n = c.node()
    if (!n || n.parent < 0) return 'Start'
    return moveText(n, true)
  }

  // %clk and %eval embedded in the PGN comments, shown with the comments
  const annotations = createMemo(() => {
    const comments = c.node()?.comments ?? []
    if (!v.showComments()) return []
    const ev = comments.find(x => x.evaluation)?.evaluation
    const clk = comments.find(x => x.clock !== undefined)?.clock
    return [
      clk !== undefined ? formatClock(clk) : undefined,
      ev
        ? isMate(ev)
          ? `#${ev.mate}`
          : `${ev.pawns > 0 ? '+' : ''}${ev.pawns.toFixed(2)}`
        : undefined,
    ].filter((x): x is string => !!x)
  })

  const hiddenPrompt = () => !c.feedback() && !v.showContinuations() && !c.atEnd()

  return (
    <nav
      class={`${boardWidth} flex min-h-13 items-center gap-3 max-lg:px-2`}
      aria-label="Move navigation"
    >
      <div class="flex shrink-0 gap-1">
        <button
          type="button"
          class={btnIcon}
          onClick={c.first}
          disabled={!c.canPrev()}
          aria-label="First position"
          title="Home"
        >
          <IconFirst />
        </button>
        <button
          type="button"
          class={btnIcon}
          onClick={c.prev}
          disabled={!c.canPrev()}
          aria-label="Previous move"
          title="←"
        >
          <IconPrev />
        </button>
        <button
          type="button"
          class={btnIcon}
          onClick={c.next}
          disabled={!c.canNext()}
          aria-label="Next move"
          title="→"
        >
          <IconNext />
        </button>
        <button
          type="button"
          class={btnIcon}
          onClick={c.last}
          disabled={!c.canNext()}
          aria-label="Last main-line position"
          title="End"
        >
          <IconLast />
        </button>
        <button type="button" class={btnIcon} onClick={v.flip} aria-label="Flip board" title="f">
          <IconFlip />
        </button>
      </div>

      <output
        class="nav-status flex min-w-0 flex-1 items-center justify-end gap-2 overflow-hidden whitespace-nowrap"
        aria-live="polite"
      >
        <Show when={c.feedback()} keyed>
          {fb => (
            <>
              <Show when={fb.kind === 'match'}>
                <span class="inline-flex items-center gap-1 font-semibold text-brand">
                  <IconCheck class="size-4.5" /> {fb.san}
                </span>
              </Show>
              <Show when={fb.kind === 'revealed'}>
                <span class="text-ink-2">Revealed {fb.san}</span>
              </Show>
              <Show when={fb.kind === 'explore'}>
                <span class="font-semibold text-ink italic">{fb.san}</span>
              </Show>
              <Show when={fb.kind === 'end'}>
                <span class="text-ink-2">End of line</span>
              </Show>
              <Show when={fb.kind === 'mismatch'}>
                <span class="font-semibold text-danger">Not in PGN</span>
                <Show when={!v.showContinuations()}>
                  <button type="button" class={btnSmall} onClick={c.reveal}>
                    Reveal
                  </button>
                </Show>
              </Show>
            </>
          )}
        </Show>
        <Show when={c.isExploring()}>
          <span class="text-ink-2 max-sm:hidden">Exploring</span>
          <button
            type="button"
            class={btnSmall}
            onClick={c.discard}
            title="Drop the explored moves and return to the PGN"
          >
            Discard
          </button>
        </Show>
        <Show when={hiddenPrompt()}>
          <span class="font-semibold text-ink">Your move</span>
          <button type="button" class={btnSmall} onClick={c.reveal}>
            Reveal
          </button>
        </Show>
        <Show when={!c.feedback() && !c.isExploring() && !hiddenPrompt()}>
          <For each={annotations()}>
            {a => <span class="text-sm text-ink-2 tabular-nums max-sm:hidden">{a}</span>}
          </For>
          <span class="truncate text-xl font-bold tracking-[-0.01em] text-ink tabular-nums">
            {position()}
          </span>
        </Show>
      </output>

      <Show when={v.engineEnabled()}>
        <span
          class="shrink-0 rounded-sm bg-surface-2 px-1.5 py-0.5 font-bold text-ink tabular-nums"
          title="Engine evaluation"
        >
          {best() ? formatScore(best()!) : '…'}
        </span>
      </Show>
    </nav>
  )
}
