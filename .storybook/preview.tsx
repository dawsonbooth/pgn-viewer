import type { Preview } from 'storybook-solidjs-vite'
import '@fontsource-variable/source-sans-3/index.css'
import '@lichess-org/chessground/assets/chessground.base.css'
import '@lichess-org/chessground/assets/chessground.cburnett.css'
import '../src/styles/global.css'

export default {
  parameters: {
    layout: 'fullscreen',
    backgrounds: { disable: true },
  },
  decorators: [Story => <div class="min-h-screen bg-ground text-ink">{Story()}</div>],
} satisfies Preview
