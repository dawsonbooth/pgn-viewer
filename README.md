# pgn-viewer

Local-first PGN viewer for the browser. Open a file, step through games,
variations and comments, hide continuations to test yourself, run Stockfish on
a position. Your PGN is never uploaded; there is no backend.

Vite + Solid + Tailwind. Chess logic is [chessops](https://github.com/niklasf/chessops),
the board is [Chessground](https://github.com/lichess-org/chessground), the
engine is [Stockfish.js](https://github.com/nmrugg/stockfish.js) (lite,
single-threaded WASM) in a Web Worker.

Stockfish is ~7 MB, so it is not part of the build. The first time you switch the
engine on the app asks, then fetches it from a public npm CDN and keeps it in the
Cache API — one download per browser. The bytes are checked against pinned
SHA-256 hashes before they run. Analysis itself is entirely local.

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
- Comments off hides comments and everything embedded in them: arrows, square
  highlights, chess.com classification badges, clocks and evaluations.
- Hint (with continuations off) shows the hint a chess.com lesson gives for the
  move to find. After a wrong move the lesson's own reply is shown too.
- Engine runs Stockfish on the current position, three lines. The first use
  asks before downloading it; after that it starts from the cache, offline.
- On desktop, drag the games list's right edge to widen it for long titles;
  double-click the edge to reset it. The width is remembered in the browser.

Keys: `←` `→` moves, `Home` `End`, `[` `]` previous/next game, `f` flip,
`c` comments, `e` engine, `v` continuations, `h` hint.

### Annotations

The markup that Lichess, chess.com, Chessable, Noctie and ChessBase exports put
in a PGN:

- **Glyphs**: `!` `?` `!!` `??` `!?` `?!` (`$1`–`$6`) are coloured in the move
  text and drawn as a badge on the board. Other glyphs (`±`, `N`, …) are plain,
  with their meaning on hover; a number without a glyph shows as `$n`.
- **Comment commands**: `%cal` arrows and `%csl` squares (filled, as chess.com
  and Chessable draw them), `%clk`, `%eval`, and from chess.com lessons `%hint`,
  `%wrong`, `%c_arrow`, `%c_highlight` and `%c_effect` (Brilliant, Great find and
  Mistake badges). Other commands (`%emt`, `%evp`, `%mdl`, `%anno`, `%fd`) are
  removed from the text.
- **Course markup**: chess.com and Chessable `@@…@@` markers (headings, quotes,
  links, escaped brackets, and `@@StartFEN@@` positions drawn as small diagrams),
  `<strong>`, `<br>` and links, and Noctie's Markdown (headings, bold, italics,
  links, lists).
- **Null moves** (`--`) and lesson positions without kings are played as
  written. Stockfish is never asked to analyse them.
- **Course titles**: a chess.com lesson is listed and titled by its
  `LessonName`, and a Noctie element by its `ElementName`, rather than by the
  course name every game shares. A Noctie game's players then sit under the
  title. Neighbouring games with the same title, such as a lesson's steps or a
  Chessable course's lines, show their `Round` in the list. The HTML escapes
  chess.com leaves in headers (`&#039;`, `&amp;`, …) are decoded.

The selected game, position and toggles are saved in IndexedDB, keyed by a
fingerprint of the file contents.

Board promotions use the PGN's piece, or a queen when exploring. Games that
fail to parse stay in the list, underlined, so numbering matches the file.

## Deployment

Pushing to `master` builds and publishes to GitHub Pages via
[.github/workflows/deploy.yml](.github/workflows/deploy.yml). It needs
**Settings → Pages → Source: GitHub Actions**. The base path comes from
`actions/configure-pages` through the `BASE_PATH` env var, so a project site
under `/<repo>/` works without hardcoding the repo name.

## License

This project's own code is public domain (see LICENSE / [Unlicense](https://unlicense.org)).

chessops and Chessground are GPL-3.0 and are bundled, so a built copy of the app
is a combined work under the GPL: keep their notices and make source available if
you redistribute `dist/`. Stockfish (also GPL-3.0) is not bundled — it is fetched
from a CDN at runtime.
