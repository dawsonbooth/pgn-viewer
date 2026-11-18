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

// chess.com lesson: glyphs, a "?" side line, commands kept out of the text
export const Lesson: Story = { args: { sample: 'annotated', game: 0, ply: 1 } }
// the same lesson with the next move hidden, and its hint asked for
export const LessonHint: Story = {
  args: { sample: 'annotated', game: 0, ply: 0, continuations: false },
  render: props => (
    <div style={{ width: '340px', height: '320px', display: 'flex', padding: '12px' }}>
      <WithViewer options={props}>
        {v => {
          v.cursor.showHint()
          return <MoveTree viewer={v} />
        }}
      </WithViewer>
    </div>
  ),
}
// Chessable chapter: a header, emphasis, escaped brackets, a diagram and a null move
export const CourseMarkup: Story = {
  args: { sample: 'annotated', game: 1, ply: 2 },
  render: props => (
    <div style={{ width: '420px', height: '520px', display: 'flex', padding: '12px' }}>
      <WithViewer options={props}>{v => <MoveTree viewer={v} />}</WithViewer>
    </div>
  ),
}
