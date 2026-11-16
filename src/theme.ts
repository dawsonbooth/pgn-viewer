import { createSignal } from 'solid-js'

type ThemePreference = 'system' | 'light' | 'dark'

// Must match the key read by the inline script in index.html.
const KEY = 'pgn-viewer:theme'

function read(): ThemePreference {
  try {
    const t = localStorage.getItem(KEY)
    return t === 'light' || t === 'dark' ? t : 'system'
  } catch {
    return 'system'
  }
}

const [preference, setPreference] = createSignal<ThemePreference>(read())

function apply(p: ThemePreference) {
  const root = document.documentElement
  if (p === 'system') delete root.dataset.theme
  else root.dataset.theme = p
  try {
    if (p === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, p)
  } catch {
    // storage blocked: the choice still holds for this page
  }
}

const ORDER: ThemePreference[] = ['system', 'light', 'dark']

export const theme = {
  preference,
  cycle() {
    const next = ORDER[(ORDER.indexOf(preference()) + 1) % ORDER.length]!
    setPreference(next)
    apply(next)
  },
}
