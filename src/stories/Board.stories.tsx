import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { Board } from '../components/Board'
import { NavBar } from '../components/NavBar'
import { WithViewer, type FixtureOptions } from './fixture'

const Demo = (props: FixtureOptions) => (
  <div style={{ width: 'min(90vw, 560px)', padding: '12px' }}>
    <WithViewer options={props}>
      {v => (
        <>
          <Board viewer={v} />
          <NavBar viewer={v} />
        </>
      )}
    </WithViewer>
  </div>
)

const meta = {
  title: 'Board',
  component: Demo,
  args: { game: 0, ply: 5, continuations: true, comments: true, orientation: 'white' },
  argTypes: { orientation: { control: 'radio', options: ['white', 'black'] } },
} satisfies Meta<typeof Demo>
export default meta
type Story = StoryObj<typeof meta>

export const WithArrow: Story = {}

export const Flipped: Story = { args: { orientation: 'black' } }

export const YourMove: Story = { args: { game: 1, ply: 0, continuations: false } }

export const FromFen: Story = { args: { game: 0, ply: 0 } }
