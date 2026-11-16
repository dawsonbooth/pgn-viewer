import { createEffect, createMemo, For, on, Show, type JSX } from 'solid-js'
import { moveText, type MoveNode, type PreparedGame } from '../chess/pgn'
import type { Viewer } from '../viewer-state'

const comment = 'text-ink-2'

// Outline labels for side lines: A, B… off the main line, then A1, A2…, then A1a, A1b…,
// alternating letters and numbers with depth.
// 0 → A, 25 → Z, 26 → AA
function letter(i: number, upper: boolean): string {
  let s = ''
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26))
    s = String.fromCharCode(((n - 1) % 26) + (upper ? 65 : 97)) + s
  return s
}

function outlineLabels(game: PreparedGame): Map<number, string> {
  const labels = new Map<number, string>()
  const walk = (start: number, prefix: string, depth: number) => {
    let count = 0
    let id: number | undefined = start
    while (id !== undefined) {
      const node: MoveNode = game.nodes[id]!
      if (node.branch === 0) {
        for (const varId of game.nodes[node.parent]!.children.slice(1)) {
          const own = depth % 2 === 0 ? letter(count, depth === 0) : String(count + 1)
          const label = prefix + own
          labels.set(varId, label)
          count++
          walk(varId, label, depth + 1)
        }
      }
      id = node.children[0]
    }
  }
  const first = game.root.children[0]
  if (first !== undefined) walk(first, '', 0)
  return labels
}

// With continuations hidden only the path to the current node is rendered at all.
export function MoveTree(props: { viewer: Viewer }) {
  const v = props.viewer
  const cur = v.cursor
  let container!: HTMLDivElement

  createEffect(
    on(
      () => cur.id(),
      () => {
        queueMicrotask(() => {
          const active = container.querySelector<HTMLElement>('[aria-current]')
          active?.scrollIntoView({ block: 'nearest' })
        })
      },
    ),
  )

  const visibleIds = createMemo(() => (v.showContinuations() ? undefined : cur.path()))

  return (
    <div class="text-[1.0625rem] leading-[1.65] text-ink" ref={e => (container = e)}>
      <Show when={cur.tree()} fallback={<p class="text-ink-2">No game selected.</p>}>
        {game => {
          const labels = createMemo(() => outlineLabels(game()))
          return (
            <>
              <Show when={game().setupError}>
                <p class="text-danger">Invalid starting position: {game().setupError}</p>
              </Show>
              <Show when={game().root.comments.length && v.showComments()}>
                <p class={`${comment} mb-2`}>
                  {game()
                    .root.comments.map(c => c.text)
                    .join(' ')}
                </p>
              </Show>
              <Show
                when={game().root.children.length}
                fallback={<p class="text-ink-2">No moves.</p>}
              >
                <Show
                  when={visibleIds()}
                  fallback={
                    <Line
                      game={game()}
                      start={game().root.children[0]!}
                      viewer={v}
                      labels={labels()}
                    />
                  }
                >
                  {ids => (
                    <div class="line mainline inline">
                      <For each={ids().slice(1)}>
                        {(id, i) => {
                          const node = () => game().nodes[id]!
                          return (
                            <Move
                              node={node()}
                              viewer={v}
                              needsNumber={i() === 0 || node().color === 'white'}
                              showComment={v.showComments()}
                              main
                            />
                          )
                        }}
                      </For>
                      <Show when={!cur.atEnd()}>
                        <span class="ml-1 rounded-sm bg-surface-2 px-1.5 py-0.5 text-[0.9375rem] font-semibold text-ink-2">
                          Next move hidden
                        </span>
                      </Show>
                    </div>
                  )}
                </Show>
              </Show>
              <Show when={v.showContinuations() && game().record.game.headers.get('Result')}>
                {result => <span class="ml-1.5 font-bold">{result()}</span>}
              </Show>
            </>
          )
        }}
      </Show>
    </div>
  )
}

function Line(props: {
  game: PreparedGame
  start: number
  viewer: Viewer
  labels: Map<number, string>
  nested?: boolean
}) {
  // reading props.game tracks the cursor's tree, which republishes itself after an
  // exploration mutates it in place
  const items = createMemo(() => {
    const out: { node: MoveNode; variations: number[] }[] = []
    let id: number | undefined = props.start
    while (id !== undefined) {
      const node: MoveNode = props.game.nodes[id]!
      const parent = props.game.nodes[node.parent]!
      const variations = node.branch === 0 ? parent.children.slice(1) : []
      out.push({ node, variations })
      id = node.children[0]
    }
    return out
  })

  const body = () => (
    <For each={items()}>
      {(item, i) => {
        const showComments = () => props.viewer.showComments()
        const prev = () => items()[i() - 1]
        // black moves get a number after a variation or comment
        const needsNumber = () =>
          item.node.color === 'white' ||
          i() === 0 ||
          prev()!.variations.length > 0 ||
          (showComments() && prev()!.node.comments.length > 0)
        return (
          <>
            <Move
              node={item.node}
              viewer={props.viewer}
              needsNumber={needsNumber()}
              showComment={showComments()}
              main={!props.nested}
            />
            <For each={item.variations}>
              {varId => (
                <Line
                  game={props.game}
                  start={varId}
                  viewer={props.viewer}
                  labels={props.labels}
                  nested
                />
              )}
            </For>
          </>
        )
      }}
    </For>
  )

  return (
    <Show when={props.nested} fallback={<div class="line mainline inline">{body()}</div>}>
      <div class="line variation my-1.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-1.5">
        <span class="min-w-5 font-bold text-brand tabular-nums">
          {props.labels.get(props.start)}
        </span>
        <div>{body()}</div>
      </div>
    </Show>
  )
}

function Move(props: {
  node: MoveNode
  viewer: Viewer
  needsNumber: boolean
  showComment: boolean
  main?: boolean
}): JSX.Element {
  const active = () => props.viewer.cursor.id() === props.node.id
  const label = () => moveText(props.node, props.needsNumber)
  return (
    <>
      <Show when={props.showComment && props.node.startingComments.length}>
        <span class={comment}>{props.node.startingComments.map(c => c.text).join(' ')}</span>{' '}
      </Show>
      <button
        type="button"
        class="move cursor-pointer rounded-sm px-[3px] leading-snug tabular-nums"
        classList={{
          'font-semibold': !!props.main,
          'active bg-accent text-on-accent': active(),
          'hover:bg-surface-2': !active(),
          'underline decoration-danger decoration-wavy': !!props.node.error,
          'transient italic underline decoration-dashed decoration-ink-3 underline-offset-[3px]':
            !!props.node.transient && !active(),
          'transient italic': !!props.node.transient && active(),
        }}
        aria-current={active() ? 'true' : undefined}
        title={
          props.node.error ?? (props.node.transient ? 'Explored move (not in PGN)' : undefined)
        }
        onClick={() => props.viewer.cursor.goTo(props.node.id)}
      >
        {label()}
      </button>{' '}
      <Show when={props.showComment && props.node.comments.some(c => c.text.trim())}>
        <span class={comment}>{props.node.comments.map(c => c.text).join(' ')}</span>{' '}
      </Show>
    </>
  )
}
