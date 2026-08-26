import type { JSX } from 'solid-js'
import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { Commentary } from '../components/Commentary'
import { EnginePanel } from '../components/EnginePanel'
import { NavBar } from '../components/NavBar'
import { Toolbar } from '../components/Toolbar'
import type { Viewer } from '../viewer-state'
import { WithViewer, type FixtureOptions } from './fixture'

const Pad = (props: { children: JSX.Element }) => (
  <div style={{ padding: '12px', 'max-width': '420px' }}>{props.children}</div>
)

const meta = { title: 'Panels' } satisfies Meta
export default meta

export const CommentaryWithNag: StoryObj = {
  render: () => (
    <Pad>
      <WithViewer options={{ ply: 5 }}>{v => <Commentary viewer={v} />}</WithViewer>
    </Pad>
  ),
}

export const CommentaryHidden: StoryObj = {
  render: () => (
    <Pad>
      <WithViewer options={{ ply: 5, comments: false }}>
        {v => <Commentary viewer={v} />}
      </WithViewer>
    </Pad>
  ),
}

export const EngineOff: StoryObj = {
  render: () => (
    <Pad>
      <WithViewer>{v => <EnginePanel viewer={v} />}</WithViewer>
    </Pad>
  ),
}

// scripted engine: no WASM, same numbers every time
export const EngineScripted: StoryObj = {
  render: () => (
    <Pad>
      <WithViewer options={{ game: 1, engine: 'scripted' }}>
        {v => {
          v.toggleEngine()
          return <EnginePanel viewer={v} />
        }}
      </WithViewer>
    </Pad>
  ),
}

// runs the real engine worker
export const EngineLive: StoryObj = {
  render: () => (
    <Pad>
      <WithViewer options={{ game: 1, ply: 6 }}>
        {v => {
          v.toggleEngine()
          return <EnginePanel viewer={v} />
        }}
      </WithViewer>
    </Pad>
  ),
}

const navStory = (options: FixtureOptions, after?: (v: Viewer) => void): StoryObj => ({
  render: () => (
    <Pad>
      <WithViewer options={options}>
        {v => {
          after?.(v)
          return <NavBar viewer={v} />
        }}
      </WithViewer>
    </Pad>
  ),
})
export const NavDefault = navStory({ ply: 3 })
export const NavYourMove = navStory({ game: 1, continuations: false })
export const NavNotInPgn = navStory({ game: 1, continuations: false }, v =>
  v.cursor.play('a2', 'a3'),
)
export const NavMatched = navStory({ game: 1 }, v => v.cursor.play('e2', 'e4'))

export const ToolbarStory: StoryObj = {
  name: 'Toolbar',
  render: () => <WithViewer>{v => <Toolbar viewer={v} />}</WithViewer>,
}
