import { Chessground } from '@lichess-org/chessground'
import type { Api } from '@lichess-org/chessground/api'
import type { Key } from '@lichess-org/chessground/types'
import { chessgroundDests } from 'chessops/compat'
import { createEffect, on, onCleanup, onMount } from 'solid-js'
import type { MoveNode } from '../chess/pgn'
import type { Viewer } from '../viewer-state'
import { boardMarks } from './board-marks'
import { boardWidth } from './NavBar'

export function Board(props: { viewer: Viewer }) {
  const v = props.viewer
  const cur = v.cursor
  let el!: HTMLElement
  let api: Api | undefined

  const sync = (node: MoveNode) =>
    api?.set({
      fen: node.fen,
      turnColor: node.pos.turn,
      check: node.check,
      lastMove: node.lastMove as Key[] | undefined,
      movable: { color: node.pos.turn, dests: node.error ? new Map() : chessgroundDests(node.pos) },
    })

  onMount(() => {
    api = Chessground(el, {
      coordinates: true,
      blockTouchScroll: true,
      disableContextMenu: true,
      animation: { duration: 180 },
      highlight: { lastMove: true, check: true },
      premovable: { enabled: false },
      drawable: { enabled: true },
      movable: {
        free: false,
        showDests: true,
        rookCastle: true,
        events: {
          after: (orig: Key, dest: Key) => {
            if (cur.play(orig, dest).kind === 'rejected') {
              // chessground already applied the move locally; put the position back
              const n = cur.node()
              if (n) sync(n)
            }
          },
        },
      },
    })

    const ro = new ResizeObserver(() =>
      document.body.dispatchEvent(new Event('chessground.resize')),
    )
    ro.observe(el)
    onCleanup(() => {
      ro.disconnect()
      api?.destroy()
    })
  })

  createEffect(
    on(
      () => cur.node(),
      node => {
        if (node) sync(node)
      },
    ),
  )

  createEffect(() => api?.set({ orientation: v.orientation() }))

  // arrows, filled squares and move badges; see board-marks
  createEffect(() => {
    const marks = boardMarks(cur.node(), v.showComments())
    api?.setAutoShapes(marks.shapes)
    api?.set({ highlight: { custom: marks.squares } })
  })

  return (
    <div class={`${boardWidth} aspect-square max-w-full touch-none [&_.cg-wrap]:size-full`}>
      <figure ref={e => (el = e)} class="board h-full w-full" aria-label="Chess board" />
    </div>
  )
}
