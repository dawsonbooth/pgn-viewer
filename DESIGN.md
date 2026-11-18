---
name: PGN Viewer
description: A calm, local-first reference reader for annotated chess games.
colors:
  ground: 'light-dark(#f6f7f5, #0b1b17)'
  surface: 'light-dark(#ffffff, #10231d)'
  surface-2: 'light-dark(#eef2f0, #173029)'
  ink: 'light-dark(#16181a, #e6ece9)'
  ink-2: 'light-dark(#46514c, #b5c4bd)'
  ink-3: 'light-dark(#5e6a65, #93a59d)'
  rule: 'light-dark(#dce3df, #1f3a32)'
  rule-strong: 'light-dark(#c2ccc7, #2d4d43)'
  shell: 'light-dark(#0f5c4a, #0c4a3c)'
  on-shell: '#ffffff'
  button: 'light-dark(#0f5c4a, #1f7a60)'
  button-hover: 'light-dark(#0b4a3b, #23876a)'
  on-button: '#ffffff'
  brand: 'light-dark(#0f5c4a, #6fcfa9)'
  accent: '#e0a21b'
  on-accent: '#16181a'
  accent-tint: 'light-dark(#fbefcf, #46370f)'
  danger: 'light-dark(#b42318, #f2786c)'
  focus: 'light-dark(#0f5c4a, #e0a21b)'
  sq-light: 'light-dark(#f7f8f4, #c9d3ce)'
  sq-dark: 'light-dark(#b3c7bd, #7f988d)'
  coord: '#102a22'
  last-move: 'light-dark(rgb(246 190 60 / 0.5), rgb(240 180 40 / 0.55))'
  dest: 'rgb(15 92 74 / 0.5)'
  glyph-brilliant: 'light-dark(#087065, #4fd3c0)'
  glyph-good: 'light-dark(#287a2c, #7dd48a)'
  glyph-interesting: 'light-dark(#9636ae, #e39bf7)'
  glyph-dubious: 'light-dark(#1c6aab, #80bdf2)'
  glyph-mistake: 'light-dark(#b0520a, #f6a35e)'
  glyph-blunder: 'light-dark(#c0281d, #ff8478)'
  badge-brilliant: '#0a7f72'
  badge-good: '#26823a'
  badge-interesting: '#9a44b9'
  badge-dubious: '#2a78bd'
  badge-mistake: '#b5530b'
  badge-blunder: '#cc3426'
  badge-only: '#4b5853'
  mark-red: 'rgb(224 66 52 / 0.6)'
  mark-green: 'rgb(110 175 40 / 0.62)'
  mark-yellow: 'rgb(255 150 20 / 0.6)'
  mark-blue: 'rgb(50 130 220 / 0.55)'
typography:
  display:
    fontFamily: "'Source Sans 3 Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: '1.875rem'
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: '-0.015em'
  headline:
    fontFamily: "'Source Sans 3 Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: '1.5rem'
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: '-0.01em'
  title:
    fontFamily: "'Source Sans 3 Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: '1.25rem'
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: '-0.01em'
    fontFeature: "'tnum'"
  reading:
    fontFamily: "'Source Sans 3 Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: '1.0625rem'
    fontWeight: 400
    lineHeight: 1.65
  body:
    fontFamily: "'Source Sans 3 Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.5
  meta:
    fontFamily: "'Source Sans 3 Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: '0.9375rem'
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Source Sans 3 Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: '0.875rem'
    fontWeight: 600
    lineHeight: 1.43
  coord:
    fontFamily: "'Source Sans 3 Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: '11px'
    fontWeight: 650
rounded:
  sm: '4px'
  md: '6px'
  lg: '8px'
  xl: '12px'
  full: '9999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '12px'
  lg: '16px'
  xl: '24px'
  2xl: '32px'
components:
  button:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.md}'
    padding: '0 12px'
    height: '36px'
  button-hover:
    backgroundColor: '{colors.surface-2}'
  button-small:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    typography: '{typography.label}'
    rounded: '{rounded.md}'
    padding: '0 10px'
    height: '32px'
  button-icon:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.md}'
    size: '40px'
  button-primary:
    backgroundColor: '{colors.button}'
    textColor: '{colors.on-button}'
    rounded: '{rounded.md}'
    padding: '0 16px'
    height: '40px'
  button-primary-hover:
    backgroundColor: '{colors.button-hover}'
  shell-button:
    backgroundColor: '{colors.shell}'
    textColor: '{colors.on-shell}'
    rounded: '{rounded.md}'
    padding: '0 10px'
    height: '32px'
  shell-toggle-pressed:
    backgroundColor: '{colors.on-shell}'
    textColor: '{colors.shell}'
    typography: '{typography.meta}'
    rounded: '5px'
    padding: '0 10px'
    height: '26px'
  pane-toggle-pressed:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    typography: '{typography.label}'
    rounded: '{rounded.md}'
    height: '32px'
  input:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.md}'
    padding: '0 10px'
    height: '36px'
  move-current:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.on-accent}'
    typography: '{typography.reading}'
    rounded: '{rounded.sm}'
    padding: '0 3px'
  game-row-selected:
    backgroundColor: '{colors.accent-tint}'
    textColor: '{colors.ink}'
    padding: '0 12px'
    height: '34px'
  variation-label:
    textColor: '{colors.brand}'
    typography: '{typography.reading}'
  top-bar:
    backgroundColor: '{colors.shell}'
    textColor: '{colors.on-shell}'
    height: '52px'
---

# Design System: PGN Viewer

## Overview

**Creative North Star: "The Opening Encyclopedia"**

PGN Viewer is a reference app for annotated chess, set like an opening book. A green top bar frames flat panes divided by 1px hairlines. The reading column holds the game title, a row of facts from the PGN headers, then the moves and annotations at reading size in a measured column, with side lines as a lettered outline (A, B, A1). Amber marks where you are and what you picked, and nothing else.

It is built for book-length sessions in either scheme. The games rail is dense for scanning (34px rows); the move text is set for reading (17px at 1.65 line height, 62ch measure). There is one typeface, Source Sans 3, self-hosted. Depth comes from tone and hairlines rather than cards or shadows. The layout is the usual chess-viewer arrangement (rail, board, move text), with no rounded cards, charcoal panels, eval bar or two-column move table.

**Key Characteristics:**

- Green shell, flat panes, 1px hairlines.
- Amber marks the current move and the selection, and nothing decorative.
- One sans face (Source Sans 3 Variable) in a short weight-driven ramp.
- The move text uses three voices: main line semibold, side lines regular, comments in secondary ink.
- Side lines appear as a lettered outline, labelled in brand green.
- Every colour is a `light-dark()` pair. The theme follows the OS, with a remembered manual override.

## Colors

The palette is a green-grey neutral family framed by one deep forest green, with a single warm amber accent.

### Primary

- **Volume-Cover Green** (`shell`, `button`, `brand`): the deep forest green. It fills the 52px top bar in both schemes and the one filled action on a screen (`button`). As text (`brand`), it lifts to a light mint in dark mode so variation labels, check marks and "match" feedback stay legible.

### Secondary

- **Bookmark Amber** (`accent`): the current move chip in the move text, the last-move squares on the board (`last-move`), and the dark-mode focus ring. It always carries dark ink (`on-accent`), never white.
- **Amber Wash** (`accent-tint`): selected game rows and text selection. In dark mode it becomes a deep olive-brown.

### Tertiary

- **Error Red** (`danger`): "Not in PGN", open errors, and the wavy underline on moves and games that failed to parse. It is used only as a state colour.

### Neutral

- **Pale Sage Ground / Green-Black Ground** (`ground`): the app background behind the board column and the import view.
- **Pane White / Deep Pine Pane** (`surface`): the games rail, the reading column, buttons, inputs and the games sheet.
- **Sage Wash** (`surface-2`): hover fills, segmented-control tracks, the engine score chip and the "Next move hidden" chip.
- **Ink** (`ink`), **Secondary Ink** (`ink-2`), **Quiet Ink** (`ink-3`): text in three steps. `ink-2` is for comments, metadata and counts. `ink-3` is for placeholders, hints and the dashed underline on explored moves.
- **Hairline** (`rule`) and **Firm Hairline** (`rule-strong`): pane dividers, and control borders plus the things you drag: the scrollbar thumb and the rail edge's line.
- **Board squares** (`sq-light`, `sq-dark`): white and green-grey, dimmed in dark mode. Coordinates use `coord` on both schemes; move destinations use translucent green (`dest`).

### Annotation

The judgements a PGN passes on moves, in the hues chess sites use for them, each clearing 4.5:1 on `surface` in both schemes.

- **Verdict inks** (`glyph-brilliant`, `glyph-good`, `glyph-interesting`, `glyph-dubious`, `glyph-mistake`, `glyph-blunder`): teal `!!`, green `!`, purple `!?`, blue `?!`, burnt orange `?`, red `??`. They colour the glyph after the SAN, never the SAN itself, and the match feedback under the board.
- **Badge fills** (`badge-*`): the same verdicts as solid discs on the board, plus slate for the only move (`□`). The board is light in both schemes, so these are single values.
- **Marks** (`mark-red`, `mark-green`, `mark-yellow`, `mark-blue`): translucent fills for squares a comment highlights. They paint over the last-move colour rather than replacing it. Yellow leans orange so it never reads as the amber last move.

### Named Rules

**The Bookmark Rule.** Amber means "you are here" or "you picked this": the current move, the last move on the board, the selected row, and the text selection. It never appears as decoration, as a heading colour, or as a button fill.

**The Paired Token Rule.** Every theme-dependent colour is a single `light-dark()` pair on `:root`, exposed through `@theme inline`. The scheme is chosen by `color-scheme`, which follows the OS or the `<html data-theme>` override. Never use Tailwind's `dark:` variant, because it ignores the manual override.

**The Shell Rule.** The shell is green in both schemes. Anything placed on it uses white text, white-alpha hovers (12%), and a white focus ring (`.on-shell`).

**The Verdict Rule.** Colour in the move text belongs to move assessments ($1–$6) and nothing else. Position and other glyphs ($10 onward: `±`, `∞`, `N`, …) stay in ink. On the amber current-move chip a verdict takes the chip's ink. The verdict palette has no yellow, so it never competes with amber.

## Typography

**Display Font:** Source Sans 3 Variable (with ui-sans-serif, system-ui, sans-serif)
**Body Font:** Source Sans 3 Variable
**Label/Mono Font:** the system monospace stack, only in the raw PGN paste field

**Character:** One plain, humanist sans that reads well for long stretches. Hierarchy comes from weight (400 / 600 / 700) and a handful of sizes, never from a second face.

### Hierarchy

- **Display** (700, 1.875rem, -0.015em): the "Open a PGN" heading in the import view.
- **Headline** (700, 1.5rem, 1.25, -0.01em, balanced): the game title at the top of the reading column. The engine's top score uses the same size.
- **Title** (700, 1.25rem, -0.01em, tabular figures): the current-move label beside the board navigation. The wordmark is 1.125rem 700.
- **Reading** (400, 1.0625rem, 1.65): the move text and annotations, held to a 62ch measure. Main-line moves are 600, side-line moves are 400, and comments use `ink-2`.
- **Body** (400, 1rem, 1.5): UI text, game rows and controls (buttons are 600).
- **Meta** (400, 0.9375rem): the header facts under the title, the shell toggles, the engine lines and the "Next move hidden" chip.
- **Label** (600, 0.875rem): compact buttons, pane toggles, counts and hints.
- **Coord** (650, 11px): board coordinates.

### Named Rules

**The One Face Rule.** Source Sans 3 Variable is the only typeface, self-hosted through `@fontsource-variable/source-sans-3`. Never load fonts from a CDN or a font service: the app makes no network fetches beyond the opt-in engine. Monospace is used only where the user edits raw PGN source.

**The Tabular Rule.** Move labels, game ordinals, years, counts, clocks and scores all use tabular figures.

## Layout

The app is a full-height column: the 52px shell, then one grid that fills the rest of the viewport. Panes scroll on their own; the page never scrolls.

- **Desktop (≥1024px):** three columns. The games rail is 252px, and dragging its edge widens it up to 35% of the window (560px at most), so long titles fit; the width is remembered on the device. The board column takes the remaining space, centred vertically, with the board sized to `min(100%, 100vh − 140px)`. The reading column is `minmax(340px, min(36vw, 560px))`. The rail and reading column are `surface` panes divided from the `ground` board column by `rule` hairlines.
- **Phone portrait:** the board is full width, with the nav row and then the reading column below it (`border-t`). A Games button in the shell opens the rail as a bottom sheet. The three toggles move from the shell into a segmented row at the top of the reading column.
- **Landscape phone/tablet (≥600px):** the board sits beside a reading column of `minmax(280px, 42%)`.
- **Reading column padding** steps from 16px to 24px to 32px at the sm and lg breakpoints, with a 16px gap between the header and the move text. The engine section is docked at the foot of the column, behind a hairline.
- **Rhythm:** a 4px base. 4, 6, 8, 10, 12 and 16px handle control-scale spacing; 24 and 32px are for pane padding and import-view sections. The import view is a single max-w-xl (36rem) column on `ground`.

## Elevation & Depth

The system is flat. Depth comes from tonal layering (`ground` under `surface`, `surface-2` for wells and hovers) and 1px hairlines. Panes, rows, the board and buttons have no shadow.

### Shadow Vocabulary

- **Sheet lift** (`box-shadow: 0 -8px 32px rgb(0 0 0 / 0.25)`, over a `black/45` backdrop): only on the phone games sheet, which is a modal `<dialog>`.
- **Pressed segment** (`box-shadow: 0 1px 2px rgb(0 0 0 / 0.14)`): only on the pressed pane toggle, so it reads as raised inside its `surface-2` track.

### Named Rules

**The Hairline Rule.** Panes separate with a 1px `rule` line, never with cards, gaps or shadows. A new surface is a pane with a hairline edge, not a floating card.

## Shapes

Corners are gently rounded and kept small. Moves and chips are 4px. Buttons, inputs and the paste area are 6px. The pane toggle track is 8px. The shell toggle track is 7px, with 5px segments. Large corners appear only on transient overlays: 12px on the top edge of the bottom sheet and on the dashed drop target. The engine progress bar is a 4px fully rounded track. Panes themselves are square and full bleed. Icons share one stroke family: a 24px grid, 1.75 stroke, round caps and joins, `currentColor`, usually 20px.

## Components

### Buttons

Neutral by default; green is reserved for the single main action.

- **Shape:** gently rounded (6px), 600 weight, icon and label gap of 6px, 150ms colour transition. Disabled buttons drop to 45% opacity.
- **Standard:** `surface` fill, 1px `rule-strong` border, `ink` text, 36px tall. Hover fills with `surface-2`.
- **Small:** the same at 32px and 0.875rem, used inline in status lines (Reveal, Discard).
- **Icon:** a 40px square on the standard skin, used for board navigation and the sheet close button.
- **Primary:** green `button` fill with white text, 40px tall, darker on hover. Use one per screen at most ("Choose file").
- **Shell:** transparent on green with white text and a `white/12` hover. 32px text buttons (Open, Paste, Games) or 32px squares (theme).
- **Focus:** a 2px `focus` outline at 2px offset (green in light mode, amber in dark), white on the shell.

### Toggles (segmented, independent)

- **Shell variant:** a `black/20` track with 3px padding. A pressed segment is white with green text and a leading check. An unpressed segment is `white/85` text with a `white/10` hover.
- **Pane variant (phone):** a 3-column `surface-2` track. A pressed segment is `surface` with `ink` text, a brand-green check and the pressed-segment shadow. An unpressed segment uses `ink-2`.
- **State:** each toggle is an independent `aria-pressed` switch. The check mark keeps the group from reading as a pick-one control.

### Inputs / Fields

- **Style:** `surface` fill, 1px `rule-strong` border, 6px radius, 36px tall, `ink-3` placeholder.
- **Focus:** the global focus ring with zero offset, so it sits on the border.
- **Paste area:** the same skin at 224px minimum height, 12px padding and monospace 0.875rem. Ctrl+Enter submits.

### Navigation

- **Top bar:** the 52px green shell holds the wordmark, the file name (600, `white/80`, truncated), Open, Paste, the toggles, the Games button on phone, and the theme cycle (System, Light, Dark).
- **Board nav row:** five icon buttons, then a right-aligned status. The status is either the current move in the title style, or feedback (a green check on a match, a cross in the verdict ink when the matched move is marked `?!`, `?` or `??`, red "Not in PGN", "Your move" with Reveal).
- **Games rail:** a filter field plus a "#" jump field and Go, then virtualised 34px rows. Each row shows a right-aligned `ink-2` ordinal, a truncated label and an `ink-2` year. When a neighbouring row has the same label, as a lesson's steps do, the game's round follows the label in `ink-2` 400, outside the truncation. The selected row gets `accent-tint` and 600 weight. A count line sits at the foot.
- **Rail edge:** the rail's right hairline is a splitter, an 8px grab area (16px for touch) with the `col-resize` cursor. A 3px line lights up over the hairline: `rule-strong` on hover after 150ms and while dragging, `focus` with keyboard focus. The arrow keys move it 16px, Home and End go to the limits, and a double-click restores 252px.

### Move Text

- **Current move:** an amber chip (`accent` fill, `on-accent` text, 4px radius, 3px side padding).
- **Main line:** moves in 600 weight. **Side lines:** a two-column grid with a bold brand-green outline label (A, B, A1) in the gutter and 400-weight moves beside it. **Comments:** inline in `ink-2`.
- **Explored moves:** italic with a dashed `ink-3` underline. **Parse errors:** a wavy `danger` underline.
- **Glyphs:** a move assessment sits against the SAN in its verdict ink at 700. Other glyphs follow after 2px in ink at 400. Each carries its meaning as a tooltip, and the move's accessible name spells it out ("16. Qf1, mistake").
- **Starting note:** a comment before the first move (such as "White to play") sits above the moves in `ink-2`.
- **Comment prose:** the first paragraph of a comment runs on from its move, and later ones start their own line 8px down. A comment that opens with punctuation hugs its move ("Qb6, although"). Inside comments: headings at reading size, 700, `ink`; emphasis at 600 or italic; quotes italic behind a 2px `rule-strong` rule; links underlined in `rule-strong`, which turns to the text colour on hover.
- **Diagrams:** a position named in a comment is drawn as a 9rem static board with chessground's pieces, framed by a 1px `rule-strong` outline and turned with the main board.
- **Hidden continuation:** with Continuations off, a `surface-2` "Next move hidden" chip ends the line. When the lesson has one, a bordered **Hint** chip follows it. The hint, and a lesson's reply to a wrong move, sit below in `ink-2`.
- **Result:** bold, after the last move, only when continuations are shown.

### Board Marks

- **Arrows:** chessground's brushes (green, red, blue, yellow) at its 60% layer opacity.
- **Squares:** `mark-*` fills over the square and the last-move colour, and under the piece, a move dot and the check glow.
- **Badges:** a disc 38% of the square wide in the top-right corner of the destination square (the king's square for castling), in its `badge-*` fill with a 2.5-unit white ring and a white 700 glyph (an outlined square for the only move). A chess.com classification on that square replaces the glyph's badge. Glyph badges always show; everything from comments follows the Comments toggle.

### Game Header

A headline title (balanced wrapping), then a wrapping list of `ink-2` header facts spaced 16px apart, with no separator glyphs: the players (when a course's name for the game is the title), ECO and opening, event, site, date, round. Unknown values are skipped, and a partial date shows only its known part. The result is left out so it can't give away a hidden continuation.

### Engine Panel

This sits at the foot of the reading column and appears only when the engine is on or asking for consent. It shows a headline-size tabular score, a 4px progress track filled with `button` green, and three lines in the meta size with right-aligned 600 scores.

## Do's and Don'ts

### Do:

- **Do** define every new colour as a `light-dark()` pair on `:root` and expose it through `@theme inline`.
- **Do** use the recipes in `src/ui.ts` whole. Never append a utility that conflicts with one the recipe already sets: Tailwind resolves conflicts by stylesheet order, not class-string order.
- **Do** keep the marker classes the vitest suites select on: `move`, `active`, `transient`, `line`, `variation`, `comment`, `glyph`, `diagram`, `hint`, `hint-button`, `wrong-note`.
- **Do** turn new comment markup into data (`src/chess/richtext.ts`) and render it as elements. Never hand text from a PGN to `innerHTML`; badge SVGs are built only from fixed strings.
- **Do** keep annotation text at the reading size (1.0625rem / 1.65) within a 62ch measure.
- **Do** separate panes with 1px `rule` hairlines on flat `surface`.
- **Do** draw new icons in the 24px, 1.75-stroke, round-cap family, inline SVG, `currentColor`.

### Don't:

- **Don't** use Tailwind's `dark:` variant; it ignores the `data-theme` override.
- **Don't** fetch fonts or any other asset from a CDN; the only network fetch beyond the app is the opt-in engine.
- **Don't** add a second typeface.
- **Don't** use amber for decoration, headings or buttons; it marks position and selection only.
- **Don't** colour a SAN or a position glyph; verdict inks are for move assessments only.
- **Don't** wrap panes in rounded, shadowed cards, or switch to charcoal panels.
- **Don't** put white text on amber; amber always carries `on-accent` ink.
