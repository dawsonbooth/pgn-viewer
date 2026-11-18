import { createEffect, createSignal, onCleanup, onMount, Show } from 'solid-js'
import { Board } from './components/Board'
import { EnginePanel } from './components/EnginePanel'
import { GameHeader } from './components/GameHeader'
import { GameList } from './components/GameList'
import { gamesColumn, GamesResizer } from './components/GamesResizer'
import { IconClose } from './components/icons'
import { ImportPanel } from './components/ImportPanel'
import { MoveTree } from './components/MoveTree'
import { NavBar } from './components/NavBar'
import { Toggles, Toolbar } from './components/Toolbar'
import { fileFromDrop } from './files/open'
import { btnIcon } from './ui'
import { createViewer } from './viewer-state'

// phone: board over the reading column; landscape phone: side by side; lg: games | board | reading
const layout =
  'grid flex-1 min-h-0 grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] ' +
  'max-lg:landscape:min-[600px]:grid-cols-[minmax(0,1fr)_minmax(280px,42%)] max-lg:landscape:min-[600px]:grid-rows-[minmax(0,1fr)] ' +
  'lg:grid-cols-[var(--games-column)_minmax(0,1fr)_minmax(340px,min(36vw,560px))] lg:grid-rows-[minmax(0,1fr)]'

export function App() {
  const v = createViewer()
  const [dragging, setDragging] = createSignal(false)
  // the import view over an open file ("Paste" from the toolbar)
  const [importing, setImporting] = createSignal(false)
  let drawer: HTMLDialogElement | undefined

  const showImport = () => {
    if (v.doc()) setImporting(true)
    else document.getElementById('pgn-paste')?.focus()
  }

  onMount(() => {
    const onKey = (e: KeyboardEvent) => {
      // a focused control used the key, such as the games list's resize handle
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (!v.doc() || importing() || v.gamesOpen()) return
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
        case 'h':
          return handled(v.cursor.showHint)
      }
    }
    window.addEventListener('keydown', onKey)
    onCleanup(() => window.removeEventListener('keydown', onKey))
  })

  // phone games list as a modal dialog: showModal() traps focus and restores it on close
  createEffect(() => {
    const open = v.gamesOpen()
    if (!drawer) return
    if (open && !drawer.open) drawer.showModal()
    else if (!open && drawer.open) drawer.close()
  })

  const onDrop = async (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = fileFromDrop(e)
    if (file) {
      await v.openFile(file)
      if (!v.openError()) setImporting(false)
    }
  }

  return (
    <div
      class="app flex h-full flex-col overflow-hidden bg-ground text-ink"
      onDragOver={e => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={e => {
        if (e.relatedTarget === null) setDragging(false)
      }}
      onDrop={e => void onDrop(e)}
    >
      <Toolbar viewer={v} onPaste={showImport} onOpened={() => setImporting(false)} />

      <Show
        when={v.doc() && (v.games().length || !v.doc()!.complete) && !importing()}
        fallback={
          <ImportPanel
            viewer={v}
            focusPaste={importing()}
            onDone={() => setImporting(false)}
            onBack={v.doc() ? () => setImporting(false) : undefined}
          />
        }
      >
        <main class={layout} style={{ '--games-column': gamesColumn() }}>
          <aside class="games-pane relative hidden min-h-0 border-r border-rule bg-surface lg:flex">
            <GameList viewer={v} />
            <GamesResizer />
          </aside>

          <section
            class={
              'flex min-h-0 min-w-0 flex-col items-center gap-2 p-3 ' +
              'max-lg:gap-1 max-lg:px-0 max-lg:pb-1 max-lg:pt-0 lg:justify-center ' +
              'max-lg:landscape:min-[600px]:justify-start max-lg:landscape:min-[600px]:pt-1.5'
            }
          >
            <Board viewer={v} />
            <NavBar viewer={v} />
          </section>

          <section
            class={
              'flex min-h-0 flex-col border-rule bg-surface max-lg:border-t lg:border-l ' +
              'max-lg:landscape:min-[600px]:border-t-0 max-lg:landscape:min-[600px]:border-l'
            }
            aria-label="Game text"
          >
            <div class="border-b border-rule p-2 lg:hidden">
              <Toggles viewer={v} variant="pane" />
            </div>
            <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 pt-4 pb-6 sm:px-6 lg:px-8 lg:pt-6">
              <GameHeader viewer={v} />
              <div class="max-w-[62ch]">
                <MoveTree viewer={v} />
              </div>
            </div>
            <Show when={v.engineEnabled() || v.downloadPrompt()}>
              <section
                class="pane-engine border-t border-rule px-4 py-3 sm:px-6 lg:px-8"
                aria-label="Engine"
              >
                <EnginePanel viewer={v} />
              </section>
            </Show>
          </section>
        </main>

        <Show when={v.openError()}>
          <div class="border-t border-rule bg-surface px-4 py-2 text-danger" role="alert">
            {v.openError()}
          </div>
        </Show>

        {/* oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- backdrop click is a mouse shortcut; Escape and the Close button cover keyboards */}
        <dialog
          ref={e => (drawer = e)}
          class={
            'drawer inset-x-0 top-auto bottom-0 m-0 h-[88dvh] max-h-none w-full max-w-none flex-col ' +
            'rounded-t-xl border-0 bg-surface p-0 pb-[env(safe-area-inset-bottom)] text-ink ' +
            'shadow-[0_-8px_32px_rgb(0_0_0/0.25)] open:flex backdrop:bg-black/45'
          }
          aria-label="Games"
          onClose={() => v.setGamesOpen(false)}
          onClick={e => {
            if (e.target === drawer) v.setGamesOpen(false)
          }}
        >
          <div class="flex items-center justify-between border-b border-rule py-2 pr-2 pl-4">
            <h2 class="text-lg font-bold">Games</h2>
            <button
              type="button"
              class={btnIcon}
              onClick={() => v.setGamesOpen(false)}
              aria-label="Close games"
            >
              <IconClose />
            </button>
          </div>
          <GameList viewer={v} onSelect={() => v.setGamesOpen(false)} />
        </dialog>
      </Show>

      <Show when={dragging()}>
        <div
          class="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-shell/88 p-6"
          aria-hidden="true"
        >
          <div class="rounded-xl border-2 border-dashed border-white/70 px-10 py-8 text-2xl font-bold text-on-shell">
            Drop PGN to open
          </div>
        </div>
      </Show>
    </div>
  )
}
