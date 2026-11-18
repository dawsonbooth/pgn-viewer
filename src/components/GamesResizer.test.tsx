import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
// the handle's size and position come from its classes
import '../styles/global.css'
import { clampGamesWidth, gamesColumn, GamesResizer, resetGamesWidth } from './GamesResizer'

const KEY = 'pgn-viewer:games-width'
const value = (handle: HTMLElement) => Number(handle.getAttribute('aria-valuenow'))

describe('clampGamesWidth', () => {
  it('keeps the rail between 252px and 35% of the window, 560px at most', () => {
    expect(clampGamesWidth(100, 1440)).toBe(252)
    expect(clampGamesWidth(400.4, 1440)).toBe(400)
    expect(clampGamesWidth(900, 1440)).toBe(504)
    expect(clampGamesWidth(900, 2560)).toBe(560)
  })
})

describe('<GamesResizer>', () => {
  let cleanup: (() => void) | undefined
  afterEach(() => cleanup?.())
  beforeEach(async () => {
    await page.viewport(1440, 900)
    resetGamesWidth()
  })

  // the handle sits on the right edge of a 252px pane, as in the app
  function mount(): HTMLElement {
    const el = document.createElement('div')
    el.style.cssText = 'position: relative; width: 252px; height: 200px'
    document.body.append(el)
    const dispose = render(() => <GamesResizer />, el)
    cleanup = () => {
      dispose()
      el.remove()
    }
    return el.querySelector<HTMLElement>('[role="separator"]')!
  }

  it('moves with the arrow keys, Home and End, and remembers the width', async () => {
    const handle = mount()
    const prevented: boolean[] = []
    const spy = (e: KeyboardEvent) => prevented.push(e.defaultPrevented)
    window.addEventListener('keydown', spy)
    handle.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(value(handle)).toBe(268)
    await userEvent.keyboard('{End}')
    expect(value(handle)).toBe(504)
    expect(gamesColumn()).toBe('clamp(252px, 504px, min(35vw, 560px))')
    expect(localStorage.getItem(KEY)).toBe('504')
    await userEvent.keyboard('{Home}')
    expect(value(handle)).toBe(252)
    expect(localStorage.getItem(KEY)).toBeNull()
    window.removeEventListener('keydown', spy)
    // so the app's shortcuts leave these keys alone
    expect(prevented).toEqual([true, true, true])
  })

  it('follows a drag of the edge', async () => {
    const handle = mount()
    const box = handle.getBoundingClientRect()
    const target = document.createElement('div')
    target.style.cssText = 'position: fixed; left: 395px; top: 40px; width: 10px; height: 10px'
    document.body.append(target)
    await userEvent.dragAndDrop(handle, target)
    target.remove()
    const moved = 400 - (box.left + box.width / 2)
    expect(Math.abs(value(handle) - (252 + moved))).toBeLessThanOrEqual(1)
    expect(Number(localStorage.getItem(KEY))).toBe(value(handle))
  })

  it('goes back to the default width on a double-click', async () => {
    const handle = mount()
    handle.focus()
    await userEvent.keyboard('{End}')
    await userEvent.dblClick(handle)
    expect(value(handle)).toBe(252)
    expect(localStorage.getItem(KEY)).toBeNull()
  })
})
