import { createEffect, createSignal, onCleanup } from 'solid-js'

// The games rail's width, set by dragging its right edge and remembered on this device.
const KEY = 'pgn-viewer:games-width'
// the default, and the narrowest the filter field shows its whole placeholder at
const MIN = 252
const MAX = 560
// the most of the window the rail may take, in percent, so the board keeps its room
const SHARE = 35
const STEP = 16

export const maxGamesWidth = (viewport: number) =>
  Math.max(MIN, Math.min(MAX, Math.floor((viewport * SHARE) / 100)))

export const clampGamesWidth = (width: number, viewport: number) =>
  Math.round(Math.min(Math.max(width, MIN), maxGamesWidth(viewport)))

function read(): number {
  try {
    const n = Number(localStorage.getItem(KEY))
    return n >= MIN && n <= MAX ? n : MIN
  } catch {
    return MIN
  }
}

function save(n: number) {
  try {
    if (n === MIN) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, String(n))
  } catch {
    // storage blocked: the width still holds for this page
  }
}

const [width, setWidth] = createSignal(read())

export function resetGamesWidth() {
  setWidth(MIN)
  save(MIN)
}

// The grid column. CSS clamps it too, so the limits hold as the window is resized.
export const gamesColumn = () => `clamp(${MIN}px, ${width()}px, min(${SHARE}vw, ${MAX}px))`

// A splitter on the rail's right hairline: drag it, use the arrow keys, Home and End, or
// double-click it to go back to the default.
export function GamesResizer() {
  const [viewport, setViewport] = createSignal(window.innerWidth)
  const onWindowResize = () => setViewport(window.innerWidth)
  window.addEventListener('resize', onWindowResize)
  onCleanup(() => window.removeEventListener('resize', onWindowResize))

  // the width the grid shows: the saved one, within this window's limits
  const shown = () => clampGamesWidth(width(), viewport())
  const resize = (n: number) => setWidth(clampGamesWidth(n, viewport()))

  const [drag, setDrag] = createSignal<{ x: number; from: number }>()
  const endDrag = () => {
    if (!drag()) return
    setDrag(undefined)
    save(width())
  }
  // keeps the cursor and stops text selection wherever the pointer goes
  createEffect(() => document.documentElement.classList.toggle('col-resizing', !!drag()))
  onCleanup(() => document.documentElement.classList.remove('col-resizing'))

  // where a key moves the edge to
  const keyTarget = (key: string): number | undefined => {
    switch (key) {
      case 'ArrowLeft':
        return shown() - STEP
      case 'ArrowRight':
        return shown() + STEP
      case 'Home':
        return MIN
      case 'End':
        return maxGamesWidth(viewport())
      default:
        return undefined
    }
  }

  return (
    // 8px (16px for touch), mostly outside the rail so the list's scrollbar stays easy to grab
    <div
      class={
        'games-resizer group absolute inset-y-0 -right-[5px] z-10 w-2 cursor-col-resize touch-none ' +
        'focus-visible:outline-none pointer-coarse:-right-[13px] pointer-coarse:w-4'
      }
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a focusable splitter with a value; <hr> can be neither
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize games list"
      aria-valuemin={MIN}
      aria-valuemax={maxGamesWidth(viewport())}
      aria-valuenow={shown()}
      aria-valuetext={`${shown()} pixels`}
      tabIndex={0}
      title="Drag to resize. Double-click to reset."
      data-dragging={drag() ? '' : undefined}
      onPointerDown={e => {
        if (e.button !== 0) return
        // no text selection or mouse events follow
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        setDrag({ x: e.clientX, from: shown() })
      }}
      onPointerMove={e => {
        const d = drag()
        if (d) resize(d.from + e.clientX - d.x)
      }}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
      onDblClick={resetGamesWidth}
      onKeyDown={e => {
        const to = keyTarget(e.key)
        if (to === undefined) return
        // also keeps the arrows and Home and End from moving through the game
        e.preventDefault()
        resize(to)
        save(width())
      }}
    >
      {/* 3px over the 1px hairline */}
      <span
        class={
          'pointer-events-none absolute inset-y-0 left-px w-[3px] transition-colors duration-150 ' +
          'group-hover:bg-rule-strong group-hover:delay-150 group-focus-visible:bg-focus ' +
          'group-data-dragging:bg-rule-strong'
        }
      />
    </div>
  )
}
