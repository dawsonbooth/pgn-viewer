import { Match, Show, Switch } from 'solid-js'
import { pickPgnFile } from '../files/open'
import { theme } from '../theme'
import {
  paneToggle,
  paneToggleTrack,
  shellBtn,
  shellIconBtn,
  shellToggle,
  shellToggleTrack,
} from '../ui'
import type { Viewer } from '../viewer-state'
import { IconCheck, IconFile, IconList, IconMoon, IconPaste, IconSun, IconSystem } from './icons'

const THEME_LABEL = { system: 'System', light: 'Light', dark: 'Dark' } as const

export function Toolbar(props: { viewer: Viewer; onPaste: () => void; onOpened?: () => void }) {
  const v = props.viewer
  const open = async () => {
    const file = await pickPgnFile()
    if (!file) return
    await v.openFile(file)
    if (!v.openError()) props.onOpened?.()
  }
  return (
    <header class="toolbar on-shell flex h-13 shrink-0 items-center gap-1.5 bg-shell pr-2 pl-3 text-on-shell sm:gap-2 lg:pr-4 lg:pl-5">
      <span
        class="mr-1 text-lg font-bold tracking-[-0.01em]"
        classList={{ 'max-sm:hidden': !!v.doc() }}
      >
        PGN Viewer
      </span>
      <span
        class="filename min-w-0 flex-1 truncate font-semibold text-white/80"
        title={v.doc()?.name}
      >
        {v.doc()?.name ?? ''}
      </span>
      <button type="button" class={shellBtn} onClick={open} aria-label="Open PGN file">
        <IconFile />
        <span class="max-sm:hidden">Open</span>
      </button>
      <button type="button" class={shellBtn} onClick={() => props.onPaste()} aria-label="Paste PGN">
        <IconPaste />
        <span class="max-sm:hidden">Paste</span>
      </button>
      <Show when={v.doc()}>
        <div class="ml-2 max-lg:hidden">
          <Toggles viewer={v} variant="shell" />
        </div>
        <button
          type="button"
          class={`mobile-only ${shellBtn} lg:hidden`}
          aria-haspopup="dialog"
          aria-expanded={v.gamesOpen()}
          onClick={() => v.setGamesOpen(true)}
          disabled={!v.games().length}
        >
          <IconList />
          <span class="tabular-nums">
            {v.games().length ? `${v.selectedIndex() + 1}/${v.games().length}` : 'Games'}
          </span>
        </button>
      </Show>
      <button
        type="button"
        class={shellIconBtn}
        onClick={theme.cycle}
        aria-label={`Theme: ${THEME_LABEL[theme.preference()]}`}
        title={`Theme: ${THEME_LABEL[theme.preference()]}`}
      >
        <Switch>
          <Match when={theme.preference() === 'system'}>
            <IconSystem />
          </Match>
          <Match when={theme.preference() === 'light'}>
            <IconSun />
          </Match>
          <Match when={theme.preference() === 'dark'}>
            <IconMoon />
          </Match>
        </Switch>
      </button>
    </header>
  )
}

export function Toggles(props: { viewer: Viewer; variant: 'shell' | 'pane' }) {
  const v = props.viewer
  const shell = () => props.variant === 'shell'
  const Toggle = (t: { on: boolean; onClick: () => void; title: string; label: string }) => (
    <button
      type="button"
      class={shell() ? shellToggle : paneToggle}
      aria-pressed={t.on}
      onClick={() => t.onClick()}
      title={t.title}
    >
      <Show when={t.on}>
        <IconCheck class={shell() ? 'size-4' : 'size-3.5 shrink-0 text-brand'} />
      </Show>
      {t.label}
    </button>
  )
  return (
    <fieldset
      class={`${shell() ? shellToggleTrack : paneToggleTrack} border-0`}
      aria-label="Visibility"
    >
      <Toggle
        on={v.showContinuations()}
        onClick={v.toggleContinuations}
        title="Show moves after the current position (v)"
        label="Continuations"
      />
      <Toggle
        on={v.showComments()}
        onClick={v.toggleComments}
        title="Show PGN comments (c)"
        label="Comments"
      />
      <Toggle
        on={v.engineEnabled()}
        onClick={v.toggleEngine}
        title="Local Stockfish analysis (e)"
        label="Engine"
      />
    </fieldset>
  )
}
