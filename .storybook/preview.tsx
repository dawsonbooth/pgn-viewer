import type { Preview } from 'storybook-solidjs-vite'
import '@lichess-org/chessground/assets/chessground.base.css'
import '@lichess-org/chessground/assets/chessground.brown.css'
import '@lichess-org/chessground/assets/chessground.cburnett.css'
import '../src/styles/global.css'

export default {
  parameters: {
    layout: 'fullscreen',
    backgrounds: { disable: true },
  },
  decorators: [
    Story => <div class="min-h-screen bg-zinc-950 text-zinc-100 antialiased">{Story()}</div>,
  ],
} satisfies Preview
