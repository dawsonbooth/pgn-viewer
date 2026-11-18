# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People studying annotated PGNs: course, book and opening-repertoire files. They open a file to work through it: reading the annotations and variations, and hiding the continuation so they can play the moves themselves and check their recall against the file.

## Product Purpose

A local-first PGN viewer for the browser. Open a `.pgn`, step through its games, variations and comments, hide what comes next to test yourself, and check a position with Stockfish. The PGN is never uploaded and there is no backend.

Success: a study file opens straight away, reads cleanly, and supports self-testing without the file ever leaving the device.

## Positioning

Compared with Lichess studies, chess.com and ChessBase:

- **Private and local.** Files never leave the browser. No account, no upload. It works offline once the app and engine are cached.
- **Self-test training.** Hiding continuations and playing the moves against the PGN is the core loop.
- **Fast on big files.** Large collections open and navigate without waiting.
- **Just a clean reader.** A focused viewer with no ecosystem, feeds or social layer around it.

## Operating Context

- The user brings an existing `.pgn` file, usually an export of a course, book or repertoire. They open it with **Open**, by dropping it on the page, or by pasting the PGN text.
- Study sessions are resumable. The selected game, position and toggles are saved in IndexedDB, keyed by a fingerprint of the file contents, so reopening the same file returns the user to where they were.
- Navigation is keyboard-driven on desktop: `←` `→` moves, `Home` `End`, `[` `]` previous/next game, `f` flip, `c` comments, `e` engine, `v` continuations, `h` hint.
- Used on desktop, tablet and phone. On desktop there are three panes (games | board | game text). On a phone the board sits above the game text, or beside it in landscape, and the games list opens as a bottom sheet.
- Shipped as a static site on GitHub Pages.

## Capabilities and Constraints

- **Read-only, always (durable rule).** The viewer never edits, annotates, saves or exports a PGN. Future work must not add editing. Moves explored off the PGN live on a transient branch (shown dashed in the move list) that **Discard** drops. The file itself is never changed.
- **Self-test loop.** With Continuations off, every move after the current position is hidden. Playing a PGN move advances and auto-plays the reply. Any other move shows "Not in PGN". **Reveal** shows the next move.
- **Comments toggle.** Turning it off hides comments and everything embedded in them: arrows, square highlights, chess.com classification badges, clocks, evaluations and a lesson's reply to a wrong move. Glyphs ($1 and so on) are part of the move and stay.
- **Annotations.** The viewer shows the markup that Lichess, chess.com, Chessable, Noctie and ChessBase exports put in a PGN: move glyphs, coloured and badged on the board; arrows and filled squares; chess.com's classification badges, hints and wrong-move replies; course headings, quotes, links and diagrams; Markdown. Null moves and lesson positions without kings are played as written, and Stockfish is never asked about a position that is not legal.
- **Hints.** With Continuations off, a lesson that gives a hint for the move to find offers a **Hint**. It shows the PGN's text only; it never plays or reveals the move.
- **Multi-game files.** Games that fail to parse stay in the list, underlined, so numbering matches the file.
- **Promotions.** Board promotions use the PGN's piece, or a queen when exploring.
- **Engine.** Stockfish.js (lite, single-threaded WASM) runs in a Web Worker and shows three lines on the current position. It is not bundled (~7 MB). The first time it is switched on, the app asks before fetching it from a public npm CDN. The bytes are checked against pinned SHA-256 hashes and kept in the Cache API: one download per browser, and offline after that. Analysis is entirely local.
- **No backend.** Nothing about the user's file or activity is sent anywhere. The only network fetch the app makes beyond its own assets is the opt-in engine download.
- **Licensing.** The project's own code is public domain (Unlicense). chessops and Chessground (GPL-3.0) are bundled, so a built copy is a GPL combined work: keep their notices and make source available when redistributing `dist/`. Stockfish (GPL-3.0) is fetched at runtime, not bundled.
- **Terminology in use.** Open, Paste, Games, Continuations, Comments, Engine, Hint, Reveal, Discard, "Not in PGN".
- **Open decision.** No target file size or performance budget has been set for "fast on big files".

## Brand Commitments

- Name: **PGN Viewer** (page title and top-bar wordmark; repository `pgn-viewer`). There is no logo or other identity asset.
- Copy is plain, terse and factual ("Everything stays in your browser.", "Not in PGN"). That is the existing style; the user hasn't made it a rule.

## Evidence on Hand

- The sample PGNs used by tests and Storybook (`samplePgn` and `annotatedPgn` in `src/test-utils.ts`, opened through `uniqueSample()` and consumed by `src/stories/fixture.tsx`). `annotatedPgn` reproduces the course-site markup listed under Annotations.
- There are no users, testimonials, usage figures, benchmarks or press. Don't invent them, including unmeasured speed claims or comparisons with other products.

## Product Principles

1. **The file stays yours.** Nothing leaves the browser. Any network fetch is opt-in, explained up front and verified.
2. **The PGN is the authority.** The viewer reads and never writes. Exploration is transient and is always measured against the file.
3. **Study comes first.** Hiding what comes next and playing it yourself is the core loop. Everything else supports working through annotated material.
4. **Fast at any size.** A large collection should feel as immediate as a single game.
5. **Only a reader.** No accounts, feeds, sharing or social layer.
