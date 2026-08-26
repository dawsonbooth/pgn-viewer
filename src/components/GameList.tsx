import { createEffect, createMemo, createSignal, For, on, Show } from 'solid-js'
import { btn, input } from '../ui'
import type { Viewer } from '../viewer-state'

const ROW = 40 // px, must match h-10
const OVERSCAN = 8

export function GameList(props: { viewer: Viewer; onSelect?: () => void }) {
  const v = props.viewer
  const [filter, setFilter] = createSignal('')
  const [scrollTop, setScrollTop] = createSignal(0)
  const [height, setHeight] = createSignal(400)
  let scroller!: HTMLDivElement

  // undefined = no filter; avoids materialising a 10k-element index array
  const visible = createMemo(() => {
    const q = filter().trim().toLowerCase()
    const games = v.games()
    if (!q) return undefined
    const out: number[] = []
    for (const g of games)
      if (g.label.toLowerCase().includes(q) || String(g.index + 1) === q) out.push(g.index)
    return out
  })
  const count = () => visible()?.length ?? v.games().length
  const indexAt = (row: number) => visible()?.[row] ?? row

  const range = createMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop() / ROW) - OVERSCAN)
    const end = Math.min(count(), Math.ceil((scrollTop() + height()) / ROW) + OVERSCAN)
    const rows: number[] = []
    for (let r = start; r < end; r++) rows.push(r)
    return rows
  })

  const scrollToSelected = () => {
    const sel = v.selectedIndex()
    const row = visible() ? visible()!.indexOf(sel) : sel
    if (row < 0) return
    const top = row * ROW
    if (top < scroller.scrollTop || top + ROW > scroller.scrollTop + scroller.clientHeight) {
      scroller.scrollTop = Math.max(0, top - scroller.clientHeight / 2 + ROW / 2)
    }
  }
  createEffect(
    on(
      () => v.selectedIndex(),
      () => queueMicrotask(scrollToSelected),
    ),
  )

  const ro = new ResizeObserver(([entry]) => entry && setHeight(entry.contentRect.height))
  createEffect(() => {
    ro.observe(scroller)
    setHeight(scroller.clientHeight)
  })

  const jump = (raw: string) => {
    const n = Number.parseInt(raw, 10)
    if (Number.isFinite(n)) {
      v.selectGame(n - 1)
      props.onSelect?.()
    }
  }

  return (
    <div class="flex min-h-0 w-full flex-1 flex-col">
      <div class="flex gap-1.5 border-b border-zinc-800 p-2">
        <input
          type="search"
          class={`game-filter ${input} flex-1`}
          placeholder="Filter games"
          aria-label="Filter games"
          value={filter()}
          onInput={e => {
            setFilter(e.currentTarget.value)
            scroller.scrollTop = 0
          }}
        />
        <form
          class="game-jump flex gap-1"
          onSubmit={e => {
            e.preventDefault()
            const field = e.currentTarget.elements.namedItem('n') as HTMLInputElement
            jump(field.value)
            field.value = ''
          }}
        >
          <input
            name="n"
            type="number"
            inputmode="numeric"
            min="1"
            max={v.games().length}
            placeholder="#"
            aria-label="Jump to game number"
            class={`${input} w-16`}
          />
          <button type="submit" class={btn} aria-label="Jump to game">
            Go
          </button>
        </form>
      </div>
      <div
        ref={e => (scroller = e)}
        class="game-scroller relative flex-1 overflow-y-auto overscroll-contain"
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- virtualised; <select> cannot be
        role="listbox"
        aria-label="Games"
        onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
      >
        <div class="relative w-full" style={{ height: `${count() * ROW}px` }}>
          <For each={range()}>
            {row => {
              const index = () => indexAt(row)
              const rec = () => v.games()[index()]
              const selected = () => v.selectedIndex() === index()
              return (
                <Show when={rec()}>
                  {r => (
                    <button
                      type="button"
                      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- see above
                      role="option"
                      class={
                        'game-row absolute top-0 left-0 flex h-10 w-full cursor-pointer items-center gap-2.5 ' +
                        'border-b border-zinc-800 px-2.5 text-left hover:bg-zinc-800'
                      }
                      classList={{ selected: selected(), 'bg-zinc-800 text-white': selected() }}
                      aria-selected={selected()}
                      style={{ transform: `translateY(${row * ROW}px)` }}
                      title={r().parseError}
                      onClick={() => {
                        v.selectGame(index())
                        props.onSelect?.()
                      }}
                    >
                      <span
                        class="game-ordinal min-w-[3.5ch] shrink-0 text-right tabular-nums"
                        classList={{ 'text-zinc-400': !selected() }}
                      >
                        {index() + 1}
                      </span>
                      <span
                        class="game-label truncate"
                        classList={{
                          'underline decoration-red-400 decoration-wavy': !!r().parseError,
                        }}
                      >
                        {r().label}
                      </span>
                    </button>
                  )}
                </Show>
              )
            }}
          </For>
        </div>
      </div>
      <div
        class="game-count border-t border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-400 tabular-nums"
        aria-live="polite"
      >
        {v.games().length ? `${v.selectedIndex() + 1} / ${v.games().length}` : '—'}
        <Show when={v.doc() && !v.doc()!.complete}> · parsing…</Show>
        <Show when={visible()}> · {count()} match</Show>
      </div>
    </div>
  )
}
