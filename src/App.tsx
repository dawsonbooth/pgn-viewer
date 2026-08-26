import { createSignal, onCleanup, onMount, Show } from 'solid-js'
import { Board } from './components/Board'
import { Commentary } from './components/Commentary'
import { EnginePanel } from './components/EnginePanel'
import { GameList } from './components/GameList'
import { MoveTree } from './components/MoveTree'
import { NavBar } from './components/NavBar'
import { Toggles, Toolbar } from './components/Toolbar'
import { fileFromDrop, pickPgnFile } from './files/open'
import { btn, btnPrimary, paneTitle, tab } from './ui'
import { createViewer } from './viewer-state'

type Tab = 'moves' | 'comments' | 'engine'
const TABS: { id: Tab; label: string }[] = [
  { id: 'moves', label: 'Moves' },
  { id: 'comments', label: 'Comments' },
  { id: 'engine', label: 'Engine' },
]

// phone: board over a tabbed panel; landscape phone: side by side; lg: games | board | panel
const layout =
  'grid flex-1 min-h-0 grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] ' +
  'max-lg:landscape:min-[600px]:grid-cols-[minmax(0,1fr)_minmax(280px,40%)] max-lg:landscape:min-[600px]:grid-rows-[minmax(0,1fr)] ' +
  'lg:grid-cols-[260px_minmax(0,1fr)_340px] lg:grid-rows-[minmax(0,1fr)]'

// below lg only the active tab's pane is shown
const pane =
  'pane flex flex-col min-h-0 px-3 py-2.5 max-lg:hidden max-lg:flex-1 max-lg:overflow-y-auto max-lg:data-active:flex'

export function App() {
  const v = createViewer()
  const [dragging, setDragging] = createSignal(false)
  const [activeTab, setActiveTab] = createSignal<Tab>('moves')

  onMount(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      const handled = (fn: () => void) => {
        e.preventDefault()
        fn()
      }
      switch (e.key) {
        case 'ArrowLeft':
          return handled(v.cursor.prev)
        case 'ArrowRight':
          return handled(v.cursor.next)
        case 'Home':
          return handled(v.cursor.first)
        case 'End':
          return handled(v.cursor.last)
        case '[':
          return handled(v.prevGame)
        case ']':
          return handled(v.nextGame)
        case 'f':
          return handled(v.flip)
        case 'c':
          return handled(v.toggleComments)
        case 'e':
          return handled(v.toggleEngine)
        case 'v':
          return handled(v.toggleContinuations)
        case 'Escape':
          return v.gamesOpen() ? handled(() => v.setGamesOpen(false)) : undefined
      }
    }
    window.addEventListener('keydown', onKey)
    onCleanup(() => window.removeEventListener('keydown', onKey))
  })

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = fileFromDrop(e)
    if (file) void v.openFile(file)
  }

  return (
    <div
      class="app flex h-full flex-col overflow-hidden"
      onDragOver={e => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={e => {
        if (e.relatedTarget === null) setDragging(false)
      }}
      onDrop={onDrop}
    >
      <Toolbar viewer={v} />

      <Show
        when={v.doc()}
        fallback={
          <main class="grid flex-1 place-items-center p-6">
            <div class="empty-card flex max-w-md flex-col gap-3.5 text-center">
              <h1 class="text-3xl font-semibold">PGN Viewer</h1>
              <p>
                Open a PGN file to browse its games, moves, variations and comments. Everything
                stays in your browser.
              </p>
              <button
                type="button"
                class={btnPrimary}
                onClick={async () => {
                  const f = await pickPgnFile()
                  if (f) void v.openFile(f)
                }}
              >
                Open PGN
              </button>
              <p class="text-zinc-400">…or drop a .pgn file anywhere on this page.</p>
              <Show when={v.openError()}>
                <p class="text-red-400">{v.openError()}</p>
              </Show>
            </div>
          </main>
        }
      >
        <main class={layout}>
          <aside class="games-pane hidden min-h-0 border-r border-zinc-800 lg:flex">
            <GameList viewer={v} />
          </aside>

          <section
            class={
              'flex min-h-0 min-w-0 flex-col items-center gap-2 p-3 ' +
              'max-lg:gap-1 max-lg:px-0 max-lg:pb-0 max-lg:pt-1.5 lg:justify-center ' +
              'max-lg:landscape:min-[600px]:justify-start'
            }
          >
            <Board viewer={v} />
            <NavBar viewer={v} />
          </section>

          <aside
            class={
              'flex min-h-0 flex-col border-zinc-800 max-lg:border-t lg:border-l ' +
              'max-lg:landscape:min-[600px]:border-t-0 max-lg:landscape:min-[600px]:border-l'
            }
          >
            <div class="flex gap-1.5 overflow-x-auto border-b border-zinc-800 px-2 py-1.5 lg:hidden [&_button]:flex-1 [&_button]:min-h-10">
              <Toggles viewer={v} />
            </div>
            <div
              class="flex gap-1 overflow-x-auto border-b border-zinc-800 px-2 py-1.5 lg:hidden"
              role="tablist"
              aria-label="Panels"
            >
              {TABS.map(t => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab() === t.id}
                  class={`tab ${tab}`}
                  onClick={() => setActiveTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <section
              class={`pane-moves ${pane} border-b border-zinc-800 lg:flex-[1_1_50%]`}
              data-active={activeTab() === 'moves' ? '' : undefined}
              aria-label="Moves"
            >
              <h2 class={`${paneTitle} max-lg:hidden`}>Moves</h2>
              <MoveTree viewer={v} />
            </section>
            <section
              class={`pane-comments ${pane} border-b border-zinc-800 lg:max-h-[30%] lg:flex-[0_1_auto] lg:overflow-y-auto`}
              data-active={activeTab() === 'comments' ? '' : undefined}
              aria-label="Commentary"
            >
              <h2 class={`${paneTitle} max-lg:hidden`}>Commentary</h2>
              <Commentary viewer={v} />
            </section>
            <section
              class={`pane-engine ${pane} lg:flex-none`}
              data-active={activeTab() === 'engine' ? '' : undefined}
              aria-label="Engine"
            >
              <h2 class={`${paneTitle} max-lg:hidden`}>Engine</h2>
              <EnginePanel viewer={v} />
            </section>
          </aside>
        </main>

        <Show when={v.openError()}>
          <div class="border-t border-zinc-800 bg-zinc-900 px-3 py-2 text-red-400" role="alert">
            {v.openError()}
          </div>
        </Show>

        {/* Mobile game drawer */}
        <Show when={v.gamesOpen()}>
          <button
            type="button"
            class="fixed inset-0 z-40 cursor-default border-0 bg-black/50 p-0"
            aria-label="Close games"
            onClick={() => v.setGamesOpen(false)}
          />
          <dialog
            open
            class={
              'drawer fixed inset-x-0 top-[8vh] bottom-0 z-50 m-0 flex h-auto max-h-none w-auto max-w-none flex-col ' +
              'rounded-t-2xl border-0 bg-zinc-900 p-0 pb-[env(safe-area-inset-bottom)] text-zinc-100 shadow-2xl'
            }
            aria-modal="true"
            aria-label="Games"
          >
            <div class="flex items-center justify-between border-b border-zinc-800 px-3 py-2.5">
              <strong>Games</strong>
              <button
                type="button"
                class={btn}
                onClick={() => v.setGamesOpen(false)}
                aria-label="Close games"
              >
                Close
              </button>
            </div>
            <GameList viewer={v} onSelect={() => v.setGamesOpen(false)} />
          </dialog>
        </Show>
      </Show>

      <Show when={dragging()}>
        <div
          class="pointer-events-none fixed inset-0 z-50 grid place-items-center border-4 border-dashed border-white bg-white/10 text-2xl"
          aria-hidden="true"
        >
          Drop PGN to open
        </div>
      </Show>
    </div>
  )
}
