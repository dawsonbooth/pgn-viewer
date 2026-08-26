import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { App } from '../App'

const meta = {
  title: 'App',
  component: App,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof App>
export default meta

export const Full: StoryObj<typeof meta> = {
  render: () => (
    <div style={{ height: '100vh' }}>
      <App />
    </div>
  ),
}

export const Phone: StoryObj<typeof meta> = {
  ...Full,
  globals: { viewport: { value: 'mobile1', isRotated: false } },
}
