// Class recipes. Each export is complete: never append a utility the recipe already sets,
// because Tailwind resolves conflicts by stylesheet order, not class-string order.

const base =
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-semibold ' +
  'cursor-pointer select-none transition-colors duration-150 ' +
  'disabled:cursor-default disabled:opacity-45'

const quiet = 'border border-rule-strong bg-surface text-ink enabled:hover:bg-surface-2'

export const btn = `${base} h-9 px-3 ${quiet}`
export const btnSmall = `${base} h-8 px-2.5 text-sm ${quiet}`
export const btnIcon = `${base} size-10 ${quiet}`

// filled; at most one per screen
export const btnPrimary = `${base} h-10 px-4 bg-button text-on-button enabled:hover:bg-button-hover`

// on the green top bar
export const shellBtn = `${base} h-8 px-2.5 text-on-shell enabled:hover:bg-white/12`
export const shellIconBtn = `${base} size-8 text-on-shell enabled:hover:bg-white/12`

// aria-pressed toggles sharing a track. Each is independent, so a pressed one also shows a
// check; without it the group would read as pick-one.
export const shellToggleTrack = 'flex min-w-0 gap-0.5 rounded-[7px] bg-black/20 p-[3px]'
export const shellToggle =
  `${base} h-[26px] gap-1 rounded-[5px] px-2.5 text-[0.9375rem] ` +
  'aria-pressed:bg-white aria-pressed:text-shell ' +
  'not-aria-pressed:text-white/85 not-aria-pressed:hover:bg-white/10'

export const paneToggleTrack = 'grid grid-cols-3 gap-0.5 rounded-lg bg-surface-2 p-[3px]'
export const paneToggle =
  `${base} h-8 min-w-0 gap-1 rounded-md px-1 text-sm ` +
  'aria-pressed:bg-surface aria-pressed:text-ink aria-pressed:shadow-[0_1px_2px_rgb(0_0_0/0.14)] ' +
  'not-aria-pressed:text-ink-2 not-aria-pressed:hover:text-ink'

export const input =
  'h-9 min-w-0 rounded-md border border-rule-strong bg-surface px-2.5 text-ink ' +
  'focus-visible:outline-offset-0'
