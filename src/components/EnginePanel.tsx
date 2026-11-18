import { parseUci } from 'chessops'
import { makeSanAndPlay } from 'chessops/san'
import { createMemo, For, Show } from 'solid-js'
import { ENGINE_DOWNLOAD_BYTES } from '../engine/assets'
import { formatScore, type EngineLine } from '../engine/uci'
import { btn } from '../ui'
import type { Viewer } from '../viewer-state'

const PV_MOVES = 8
const mb = (bytes: number) => `${Math.round(bytes / 1e6)} MB`

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

  const percent = () => {
    const p = v.engineProgress()
    if (!p?.total) return undefined
    return Math.min(100, Math.round((p.loaded / p.total) * 100))
  }

  return (
    <div class="engine">
      <Show
        when={v.engineEnabled()}
        fallback={
          <Show
            when={v.downloadPrompt()}
            fallback={
              <p class="text-ink-2">
                Engine off. Press{' '}
                <kbd class="rounded-sm border border-rule-strong bg-surface-2 px-1.5 font-sans font-semibold">
                  e
                </kbd>{' '}
                or use the toggle.
              </p>
            }
          >
            <div class="engine-consent flex flex-col items-start gap-2.5">
              <p class="text-ink">
                Stockfish is a {mb(ENGINE_DOWNLOAD_BYTES)} download, fetched once from a public CDN
                and kept in this browser. Analysis then runs entirely on your device.
              </p>
              <div class="flex gap-1.5">
                <button type="button" class={btn} onClick={v.confirmEngineDownload}>
                  Download and enable
                </button>
                <button type="button" class={btn} onClick={v.dismissEngineDownload}>
                  Not now
                </button>
              </div>
            </div>
          </Show>
        }
      >
        <div class="flex items-baseline gap-3">
          <span
            class="engine-score text-2xl font-bold tracking-[-0.01em] tabular-nums"
            aria-live="polite"
          >
            {best() ? formatScore(best()!) : v.analysable() ? '…' : '—'}
          </span>
          <span class="text-sm text-ink-2">
            <Show when={v.engineStatus() === 'downloading'}>
              downloading Stockfish{percent() === undefined ? '' : ` ${percent()}%`}…
            </Show>
            <Show when={v.engineStatus() === 'loading'}>starting Stockfish…</Show>
            <Show when={v.engineStatus() === 'thinking' || v.engineStatus() === 'ready'}>
              <Show when={v.analysable()} fallback="illegal position, no analysis">
                {best() ? `depth ${best()!.depth}` : 'analysing…'}
              </Show>
            </Show>
            <Show when={v.engineStatus() === 'error'}>error: {v.engineDetail()}</Show>
          </span>
        </div>
        <Show when={v.engineStatus() === 'downloading' && percent() !== undefined}>
          <div class="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              class="h-full origin-left bg-button transition-transform duration-200"
              style={{ transform: `scaleX(${percent()! / 100})` }}
            />
          </div>
        </Show>
        <ol class="engine-lines mt-2 flex list-none flex-col gap-1 p-0 text-[0.9375rem]">
          <For each={lines()}>
            {line => (
              <li class="flex items-baseline gap-2.5">
                <span class="min-w-[5.5ch] shrink-0 text-right font-semibold tabular-nums">
                  {formatScore(line)}
                </span>
                <span class="truncate text-ink">{pvSan(line)}</span>
              </li>
            )}
          </For>
        </ol>
      </Show>
    </div>
  )
}
