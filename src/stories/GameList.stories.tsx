import { createResource, Show, type JSX } from 'solid-js'
import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { GameList } from '../components/GameList'
import { createViewer } from '../viewer-state'
import { bigPgn, WithViewer } from './fixture'

const Frame = (props: { children: JSX.Element }) => (
  <div style={{ width: '280px', height: '480px', display: 'flex', border: '1px solid #27272a' }}>
    {props.children}
  </div>
)

const meta = { title: 'GameList' } satisfies Meta
export default meta

export const Small: StoryObj = {
  render: () => (
    <Frame>
      <WithViewer>{v => <GameList viewer={v} />}</WithViewer>
    </Frame>
  ),
}

export const TenThousand: StoryObj = {
  render: () => {
    const [viewer] = createResource(async () => {
      const v = createViewer()
      await v.openFile(new File([bigPgn(10_000)], 'big.pgn'))
      v.selectGame(7391)
      return v
    })
    return (
      <Frame>
        <Show when={viewer()}>{v => <GameList viewer={v()} />}</Show>
      </Frame>
    )
  },
}
