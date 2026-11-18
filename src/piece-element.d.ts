// Chessground draws pieces as <piece class="knight white">; diagrams in comments reuse that
// element so they get the same piece set from chessground's stylesheet.
declare module 'solid-js' {
  namespace JSX {
    interface IntrinsicElements {
      piece: HTMLAttributes<HTMLElement>
    }
  }
}

// oxlint-disable-next-line unicorn/require-module-specifiers -- makes this file a module, so the block above augments solid-js instead of replacing it
export {}
