import { createEffect, createMemo, For, on, Show, type JSX } from 'solid-js'
import type { Commentary as Comment } from '../chess/comment'
import type { MoveNode, PreparedGame } from '../chess/pgn'
import { continuesSentence } from '../chess/richtext'
import type { Viewer } from '../viewer-state'
import { Commentary } from './Commentary'
import { MoveLabel, spokenMove } from './MoveLabel'

// words or a diagram; a comment that only held commands has nothing to show
const shows = (c: Comment) => c.blocks.length > 0
const hasText = (node: MoveNode) => node.comments.some(shows)

// "6... Qb6, although…": a comment that carries on the sentence hugs its move
function hugsMove(node: MoveNode): boolean {
  const first = node.comments.find(shows)?.blocks[0]
  const span = first?.kind === 'paragraph' ? first.spans[0] : undefined
  return span?.kind === 'text' && continuesSentence(span.text)
}

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
  let hintText: HTMLOutputElement | undefined

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
              <Show when={hasText(game().root) && v.showComments()}>
                <Commentary
                  comments={game().root.comments}
                  orientation={v.orientation()}
                  class="mb-2"
                />
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
                        <Show when={cur.hint() && !cur.hintShown()}>
                          <button
                            type="button"
                            class="hint-button ml-1.5 cursor-pointer rounded-sm border border-rule-strong bg-surface px-1.5 text-[0.9375rem] font-semibold text-ink hover:bg-surface-2"
                            onClick={() => {
                              cur.showHint()
                              // the button goes away; focus moves to what it revealed
                              hintText?.focus()
                            }}
                            aria-keyshortcuts="h"
                            title="h"
                          >
                            Hint
                          </button>
                        </Show>
                      </Show>
                      {/* in place, empty, while a hint is on offer, so that screen readers
                          announce it when it is filled */}
                      <Show when={cur.hint()}>
                        {hint => (
                          <output
                            ref={e => (hintText = e)}
                            tabIndex={-1}
                            class="hint block text-ink-2"
                            classList={{ 'mt-2': cur.hintShown() }}
                          >
                            <Show when={cur.hintShown()}>
                              <span class="font-semibold text-ink">Hint:</span> {hint()}
                            </Show>
                          </output>
                        )}
                      </Show>
                      {/* a lesson's reply to a move it does not list; it often gives the
                          idea away, so it is commentary and follows the toggle */}
                      <Show
                        when={
                          v.showComments() && cur.feedback()?.kind === 'mismatch' && cur.wrongNote()
                        }
                      >
                        {note => <output class="wrong-note mt-2 block text-ink-2">{note()}</output>}
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
          (showComments() && hasText(prev()!.node))
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
  const orientation = () => props.viewer.orientation()
  return (
    <>
      <Show when={props.showComment && props.node.startingComments.some(shows)}>
        <Commentary
          comments={props.node.startingComments}
          orientation={orientation()}
          inline
        />{' '}
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
        aria-label={props.node.nags.length ? spokenMove(props.node, props.needsNumber) : undefined}
        title={
          props.node.error ?? (props.node.transient ? 'Explored move (not in PGN)' : undefined)
        }
        onClick={() => props.viewer.cursor.goTo(props.node.id)}
      >
        <MoveLabel node={props.node} numbered={props.needsNumber} plain={active()} />
      </button>
      {props.showComment && hugsMove(props.node) ? '' : ' '}
      <Show when={props.showComment && hasText(props.node)}>
        <Commentary comments={props.node.comments} orientation={orientation()} inline />{' '}
      </Show>
    </>
  )
}
