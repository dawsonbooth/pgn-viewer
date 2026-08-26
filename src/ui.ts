export const btn =
  'inline-flex items-center justify-center gap-1 min-h-9 px-3 rounded-md border border-zinc-800 bg-zinc-900 ' +
  'whitespace-nowrap cursor-pointer hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-default disabled:hover:bg-zinc-900'

export const btnIcon = `${btn} min-w-11 min-h-11 px-0 text-lg`

export const btnSmall = `${btn} min-h-7 px-2 text-xs`

export const btnPrimary = `${btn} min-h-12 text-base font-semibold text-black bg-white border-white hover:bg-zinc-200`

export const toggle =
  `${btn} aria-pressed:bg-white aria-pressed:border-white aria-pressed:text-black ` +
  "aria-pressed:before:content-['●'] aria-pressed:before:text-[9px] aria-pressed:before:mr-1"

export const tab = `${btn} flex-1 min-h-10 aria-selected:bg-white aria-selected:border-white aria-selected:text-black`

export const input =
  'min-h-9 min-w-0 px-2 rounded-md border border-zinc-800 bg-zinc-950 placeholder:text-zinc-500'

export const paneTitle = 'mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400'
