import { createEffect, createMemo, For, on, Show, type JSX } from 'solid-js'
import { nagGlyph, type MoveNode, type PreparedGame } from '../chess/pgn'
import type { Viewer } from '../viewer-state'

const comment = 'mx-1 italic text-zinc-400'

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
    <div
      class="min-h-0 flex-1 overflow-y-auto overscroll-contain leading-[1.9]"
      ref={e => (container = e)}
    >
      <Show when={cur.tree()} fallback={<p class="text-zinc-400">No game selected.</p>}>
        {game => (
          <>
            <Show when={game().setupError}>
              <p class="text-red-400">Invalid starting position: {game().setupError}</p>
            </Show>
            <Show when={game().root.comments.length && v.showComments()}>
              <div class={`${comment} mb-1.5 block`}>
                {game()
                  .root.comments.map(c => c.text)
                  .join(' ')}
              </div>
            </Show>
            <Show
              when={game().root.children.length}
              fallback={<p class="text-zinc-400">No moves.</p>}
            >
              <Show
                when={visibleIds()}
                fallback={<Line game={game()} start={game().root.children[0]!} viewer={v} />}
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
                          />
                        )
                      }}
                    </For>
                  </div>
                )}
              </Show>
            </Show>
            <Show when={v.showContinuations() && game().record.game.headers.get('Result')}>
              {result => <div class="ml-1.5 inline-block font-semibold">{result()}</div>}
            </Show>
          </>
        )}
      </Show>
    </div>
  )
}

function Line(props: { game: PreparedGame; start: number; viewer: Viewer; nested?: boolean }) {
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

  return (
    <div
      class="line"
      classList={{
        'mainline inline': !props.nested,
        'variation my-0.5 ml-2.5 block border-l-2 border-zinc-800 pl-2 text-[0.93em] text-zinc-400':
          !!props.nested,
      }}
    >
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
              />
              <For each={item.variations}>
                {varId => <Line game={props.game} start={varId} viewer={props.viewer} nested />}
              </For>
            </>
          )
        }}
      </For>
    </div>
  )
}

function Move(props: {
  node: MoveNode
  viewer: Viewer
  needsNumber: boolean
  showComment: boolean
}): JSX.Element {
  const active = () => props.viewer.cursor.id() === props.node.id
  const label = () =>
    `${props.needsNumber ? `${props.node.moveNumber}${props.node.color === 'white' ? '.' : '...'} ` : ''}${props.node.san}${props.node.nags.map(nagGlyph).join('')}`
  return (
    <>
      <Show when={props.showComment && props.node.startingComments.length}>
        <span class={comment}>{props.node.startingComments.map(c => c.text).join(' ')}</span>
      </Show>
      <button
        type="button"
        class="move mx-px min-h-7 cursor-pointer rounded px-1.25 py-0.5 tabular-nums"
        classList={{
          'active bg-white text-black': active(),
          'hover:bg-zinc-800': !active(),
          'underline decoration-red-400 decoration-wavy': !!props.node.error,
          'transient italic text-white underline decoration-dashed decoration-zinc-500 underline-offset-2':
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
      </button>
      <Show when={props.showComment && props.node.comments.some(c => c.text.trim())}>
        <span class={comment}>{props.node.comments.map(c => c.text).join(' ')}</span>
      </Show>
    </>
  )
}
