import { createRoot } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it } from 'vitest'
import { annotatedPgn, uniqueSample } from '../test-utils'
import { createViewer, type Viewer } from '../viewer-state'
import { MoveTree } from './MoveTree'

let cleanup: (() => void) | undefined
afterEach(() => cleanup?.())

async function mount(pgn?: string): Promise<{ v: Viewer; el: HTMLElement }> {
  const el = document.createElement('div')
  document.body.append(el)
  const v = createRoot(() => createViewer())
  await v.openFile(uniqueSample(pgn))
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

describe('<MoveTree> annotations', () => {
  it('never shows comment commands or course markup as text', async () => {
    const { v, el } = await mount(annotatedPgn)
    for (const game of [0, 1]) {
      v.selectGame(game)
      await Promise.resolve()
      expect(el.textContent).not.toMatch(/\[%|@@|\*\*/)
    }
  })

  it('colours move assessments and names them for screen readers', async () => {
    const { el } = await mount(annotatedPgn)
    const qf1 = [...el.querySelectorAll<HTMLElement>('.move')].find(m =>
      m.textContent?.startsWith('16. Qf1'),
    )!
    expect(qf1.textContent).toBe('16. Qf1?')
    expect(qf1.querySelector('.glyph')?.className).toContain('text-glyph-mistake')
    expect(qf1.getAttribute('aria-label')).toBe('16. Qf1, mistake')
  })

  it('renders course markup: headings, emphasis, diagrams', async () => {
    const { v, el } = await mount(annotatedPgn)
    v.selectGame(1)
    await Promise.resolve()
    expect(el.querySelector('.comment h2')?.textContent).toBe('Opening traps')
    expect(el.querySelector('.comment strong')?.textContent).toBe('first')
    expect(el.textContent).toContain('trap (of many):')
    const diagram = el.querySelector('figure.diagram')!
    expect(diagram.getAttribute('aria-label')).toBe('Diagram, White to move')
    expect(diagram.querySelectorAll('piece')).toHaveLength(32)
    // the comment opens with a comma, so it hugs its move; the null move is in the line
    expect(el.textContent).toContain('2. Nf3!, developing.')
    expect([...el.querySelectorAll('.move')].map(m => m.textContent)).toContain('2. --')
  })

  it('offers the hint with the next move hidden, and the lesson reply to a wrong move', async () => {
    const { v, el } = await mount(annotatedPgn)
    v.toggleContinuations()
    await Promise.resolve()
    const hint = el.querySelector<HTMLElement>('.hint')!
    expect(hint.textContent).toBe('')
    const button = el.querySelector<HTMLButtonElement>('.hint-button')!
    button.focus()
    button.click()
    expect(hint.textContent).toBe('Hint: Trade the queen for two rooks.')
    expect(el.querySelector('.hint-button')).toBeNull()
    // the button is gone, so focus goes to the hint rather than to the page
    expect(document.activeElement).toBe(hint)
    v.cursor.play('a2', 'a3')
    expect(el.querySelector('.wrong-note')?.textContent).toBe('Black is winning. Try again.')
    v.toggleComments()
    expect(el.querySelector('.wrong-note')).toBeNull()
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
