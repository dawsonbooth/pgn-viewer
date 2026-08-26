# pgn-viewer

Local-first PGN viewer for the browser. Open a file, step through games,
variations and comments, hide continuations to test yourself, run Stockfish on
a position. Nothing is uploaded; there is no backend.

Vite + Solid + Tailwind. Chess logic is [chessops](https://github.com/niklasf/chessops),
the board is [Chessground](https://github.com/lichess-org/chessground), the
engine is [Stockfish.js](https://github.com/nmrugg/stockfish.js) (lite,
single-threaded WASM) in a Web Worker.

## Development

```
bun install
bun run dev
bun run build        # static output in dist/
bun run lint         # oxfmt --check, oxlint, tsc
bun run format
bun run test         # vitest browser mode; `bun x vitest run` for a single pass
bun run storybook
```

Tests run in Chrome through Playwright's `chrome` channel (the locally
installed browser). Set `VITEST_BROWSER_CHANNEL` to use another, or run
`bun x playwright install chromium`.

## Usage

- Open PGN, or drop a `.pgn` on the page.
- Continuations off hides every move after the current position. Play a move
  on the board: a PGN move advances (and the reply is auto-played); anything
  else shows "Not in PGN". Reveal shows the next move.
- Continuations on: legal moves not in the PGN are explored on a transient
  branch (dashed in the move list). Discard drops it. The file is never edited.
- Comments off hides comments and the arrows/circles embedded in them.
- Engine runs Stockfish on the current position, three lines.

Keys: `←` `→` moves, `Home` `End`, `[` `]` previous/next game, `f` flip,
`c` comments, `e` engine, `v` continuations.

The selected game, position and toggles are saved in IndexedDB, keyed by a
fingerprint of the file contents.

Board promotions use the PGN's piece, or a queen when exploring. Games that
fail to parse stay in the list, underlined, so numbering matches the file.

## License

This project's own code is public domain (see LICENSE / [Unlicense](https://unlicense.org)).

chessops, Chessground and Stockfish are GPL-3.0, so a built copy of the app is a
combined work under the GPL: keep their notices and make source available if you
redistribute `dist/`.
