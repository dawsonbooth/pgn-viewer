import { parseUci } from 'chessops'
import { makeSanAndPlay } from 'chessops/san'
import { createMemo, For, Show } from 'solid-js'
import { formatScore, type EngineLine } from '../engine/uci'
import type { Viewer } from '../viewer-state'

const PV_MOVES = 8

export function EnginePanel(props: { viewer: Viewer }) {
  const v = props.viewer

  const lines = createMemo<EngineLine[]>(() => v.analysis()?.lines ?? [])

  const pvSan = (line: EngineLine): string => {
    const node = v.cursor.node()
    if (!node) return line.pv.join(' ')
    const pos = node.pos.clone()
    const parts: string[] = []
    for (const uci of line.pv.slice(0, PV_MOVES)) {
      const move = parseUci(uci)
      if (!move) break
      const prefix =
        pos.turn === 'white'
          ? `${pos.fullmoves}. `
          : parts.length === 0
            ? `${pos.fullmoves}... `
            : ''
      try {
        parts.push(prefix + makeSanAndPlay(pos, move))
      } catch {
        break
      }
    }
    return parts.join(' ')
  }

  const best = () => lines()[0]

  return (
    <div class="engine">
      <Show
        when={v.engineEnabled()}
        fallback={
          <p class="text-zinc-400">
            Engine off. Press <kbd class="rounded-sm bg-zinc-800 px-1 font-mono">e</kbd> or use the
            toggle.
          </p>
        }
      >
        <div class="flex items-baseline gap-3">
          <span class="engine-score font-mono text-2xl font-bold" aria-live="polite">
            {best() ? formatScore(best()!) : '…'}
          </span>
          <span class="text-xs text-zinc-400">
            <Show when={v.engineStatus() === 'loading'}>loading Stockfish…</Show>
            <Show when={v.engineStatus() === 'thinking' || v.engineStatus() === 'ready'}>
              {best() ? `depth ${best()!.depth}` : 'analysing…'}
            </Show>
            <Show when={v.engineStatus() === 'error'}>error: {v.engineDetail()}</Show>
          </span>
        </div>
        <ol class="engine-lines mt-2 flex list-none flex-col gap-1 p-0 text-sm">
          <For each={lines()}>
            {line => (
              <li class="flex items-baseline gap-2.5">
                <span class="min-w-[5.5ch] shrink-0 text-right font-mono font-semibold">
                  {formatScore(line)}
                </span>
                <span class="truncate">{pvSan(line)}</span>
              </li>
            )}
          </For>
        </ol>
      </Show>
    </div>
  )
}
