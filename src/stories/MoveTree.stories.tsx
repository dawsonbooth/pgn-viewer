import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { MoveTree } from '../components/MoveTree'
import { WithViewer, type FixtureOptions } from './fixture'

const Demo = (props: FixtureOptions) => (
  <div style={{ width: '340px', height: '320px', display: 'flex', padding: '12px' }}>
    <WithViewer options={props}>{v => <MoveTree viewer={v} />}</WithViewer>
  </div>
)

const meta = {
  title: 'MoveTree',
  component: Demo,
  args: { game: 0, ply: 5, continuations: true, comments: true },
} satisfies Meta<typeof Demo>
export default meta
type Story = StoryObj<typeof meta>

export const WithVariation: Story = {}
export const CommentsHidden: Story = { args: { comments: false } }
export const ContinuationsHidden: Story = { args: { continuations: false, ply: 3 } }
export const LongGame: Story = { args: { game: 1, ply: 20 } }
