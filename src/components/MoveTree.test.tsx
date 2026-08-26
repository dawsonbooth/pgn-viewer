import { createRoot } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it } from 'vitest'
import { uniqueSample } from '../test-utils'
import { createViewer, type Viewer } from '../viewer-state'
import { MoveTree } from './MoveTree'

let cleanup: (() => void) | undefined
afterEach(() => cleanup?.())

async function mount(): Promise<{ v: Viewer; el: HTMLElement }> {
  const el = document.createElement('div')
  document.body.append(el)
  const v = createRoot(() => createViewer())
  await v.openFile(uniqueSample())
  const dispose = render(() => <MoveTree viewer={v} />, el)
  cleanup = () => {
    dispose()
    el.remove()
  }
  return { v, el }
}

const moveTexts = (el: HTMLElement) => [...el.querySelectorAll('.move')].map(m => m.textContent)

describe('<MoveTree>', () => {
  it('renders main line, nested variations and comments', async () => {
    const { el } = await mount()
    expect(moveTexts(el)).toContain('4. Ng5')
    expect(moveTexts(el)).toContain('6. Nxf7!')
    expect(el.querySelectorAll('.line.variation')).toHaveLength(1)
    expect(el.querySelector('.line.variation')?.textContent).toContain('5... Na5')
    expect(el.textContent).toContain('The fried liver.')
  })

  it('marks the active move and navigates on click', async () => {
    const { v, el } = await mount()
    expect(el.querySelector('[aria-current]')).toBeNull()
    ;(el.querySelector('.move') as HTMLButtonElement).click()
    expect(v.cursor.node()?.san).toBe('Ng5')
    expect(el.querySelector('[aria-current]')?.textContent).toBe('4. Ng5')
  })

  it('puts no future moves in the DOM when continuations are hidden', async () => {
    const { v, el } = await mount()
    v.cursor.next()
    v.cursor.next()
    v.toggleContinuations()
    expect(moveTexts(el)).toEqual(['4. Ng5', 'd5'])
    expect(el.textContent).not.toContain('exd5')
    expect(el.textContent).not.toContain('Na5')
    v.toggleContinuations()
    expect(moveTexts(el).length).toBe(15)
  })

  it('hides comments when toggled off', async () => {
    const { v, el } = await mount()
    v.toggleComments()
    expect(el.textContent).not.toContain('fried liver')
    expect(el.textContent).not.toContain('White to play')
  })
})

describe('<MoveTree> exploration', () => {
  it('renders explored moves as transient and removes them on discard', async () => {
    const { v, el } = await mount()
    v.selectGame(1)
    v.cursor.play('a2', 'a3')
    v.cursor.play('e7', 'e5')
    await Promise.resolve()
    expect(moveTexts(el)).toContain('1. a3')
    expect(el.querySelectorAll('.move.transient')).toHaveLength(2)
    expect(el.querySelector('.move.transient.active')?.textContent).toBe('e5')
    v.cursor.discard()
    await Promise.resolve()
    expect(el.querySelectorAll('.move.transient')).toHaveLength(0)
    expect(moveTexts(el)).not.toContain('1. a3')
  })
})
