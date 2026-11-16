import { createSignal, onMount, Show } from 'solid-js'
import { pickPgnFile } from '../files/open'
import { btn, btnPrimary } from '../ui'
import type { Viewer } from '../viewer-state'
import { IconFile } from './icons'

// Shown when nothing is open, and again when "Paste" is used with a file already open.
export function ImportPanel(props: {
  viewer: Viewer
  focusPaste?: boolean
  onDone?: () => void
  onBack?: () => void
}) {
  const v = props.viewer
  const [text, setText] = createSignal('')
  let area!: HTMLTextAreaElement

  onMount(() => {
    if (props.focusPaste) area.focus()
  })

  const openPicked = async () => {
    const f = await pickPgnFile()
    if (!f) return
    await v.openFile(f)
    if (!v.openError()) props.onDone?.()
  }

  const openPasted = async () => {
    const pgn = text().trim()
    if (!pgn) return
    await v.openFile(new File([pgn], 'Pasted PGN.pgn', { type: 'application/x-chess-pgn' }))
    if (!v.openError()) props.onDone?.()
  }

  return (
    <main class="flex flex-1 justify-center overflow-y-auto bg-ground px-4 py-10 sm:py-16">
      <div class="flex w-full max-w-xl flex-col gap-6">
        <div class="flex flex-col gap-2">
          <h1 class="text-3xl font-bold tracking-[-0.015em] text-ink">Open a PGN</h1>
          <p class="text-[1.0625rem] leading-relaxed text-ink-2">
            Everything stays in your browser.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
          <button type="button" class={btnPrimary} onClick={openPicked}>
            <IconFile />
            Choose file
          </button>
          <span class="text-ink-2 max-sm:hidden">or drop a .pgn file anywhere on this page</span>
        </div>

        <form
          class="flex flex-col gap-2.5 border-t border-rule pt-6"
          onSubmit={e => {
            e.preventDefault()
            void openPasted()
          }}
        >
          <label class="flex flex-col gap-2.5">
            <span class="font-semibold text-ink">Paste PGN text</span>
            <textarea
              id="pgn-paste"
              ref={e => (area = e)}
              class={
                'min-h-56 w-full resize-y rounded-md border border-rule-strong bg-surface p-3 ' +
                'font-mono text-sm leading-relaxed text-ink focus-visible:outline-offset-0'
              }
              placeholder={
                '[Event "Casual game"]\n[White "…"]\n[Black "…"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *'
              }
              spellcheck={false}
              autocomplete="off"
              value={text()}
              onInput={e => setText(e.currentTarget.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault()
                  void openPasted()
                }
              }}
            />
          </label>
          <div class="flex flex-wrap items-center gap-3">
            <button type="submit" class={btn} disabled={!text().trim() || v.isOpening()}>
              Open pasted text
            </button>
            <span class="text-sm text-ink-3 max-sm:hidden">Ctrl+Enter</span>
            <Show when={props.onBack}>
              <button type="button" class={`${btn} ml-auto`} onClick={() => props.onBack?.()}>
                Back to {v.doc()?.name}
              </button>
            </Show>
          </div>
          <Show when={v.openError()}>
            <p class="text-danger" role="alert">
              {v.openError()}
            </p>
          </Show>
        </form>
      </div>
    </main>
  )
}
