import { createResource, Show, type JSX } from 'solid-js'
import { scriptedTransport, stubEngine } from '../engine/scripted'
import { StockfishEngine } from '../engine/stockfish'
import type { EngineFactory } from '../engine/uci'
import { annotatedPgn, samplePgn, uniqueSample } from '../test-utils'
import { createViewer, type Viewer } from '../viewer-state'

export interface FixtureOptions {
  // 'annotated': course-site markup: hints, effects, diagrams, a null move
  sample?: 'basic' | 'annotated'
  game?: number
  ply?: number
  continuations?: boolean
  comments?: boolean
  orientation?: 'white' | 'black'
  // swaps the WASM worker for an in-memory engine: instant and always the same
  engine?: 'scripted'
}

const scriptedEngine: EngineFactory = opts =>
  new StockfishEngine(opts, scriptedTransport(stubEngine))

export async function openSample(opts: FixtureOptions = {}): Promise<Viewer> {
  const v = createViewer(opts.engine === 'scripted' ? { createEngine: scriptedEngine } : {})
  await v.openFile(uniqueSample(opts.sample === 'annotated' ? annotatedPgn : samplePgn))
  if (opts.game !== undefined) v.selectGame(opts.game)
  for (let i = 0; i < (opts.ply ?? 0); i++) v.cursor.next()
  if (opts.continuations === false) v.toggleContinuations()
  if (opts.comments === false) v.toggleComments()
  if (opts.orientation === 'black') v.flip()
  return v
}

export function WithViewer(props: {
  options?: FixtureOptions
  children: (v: Viewer) => JSX.Element
}) {
  const [viewer] = createResource(() => openSample(props.options))
  return <Show when={viewer()}>{v => props.children(v())}</Show>
}

export function bigPgn(n: number): string {
  return Array.from(
    { length: n },
    (_, i) => `[Event "Puzzle ${i + 1}"]\n\n1. e4 e5 2. Nf3 Nc6 *\n`,
  ).join('\n')
}
