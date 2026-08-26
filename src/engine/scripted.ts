import type { EngineTransport } from './transport'

// Answers a command by playing lines back, the way the real engine would.
export type Responder = (cmd: string, emit: (line: string) => void) => void

export interface ScriptedTransport extends EngineTransport {
  // every command the engine has sent, oldest first
  readonly sent: string[]
  // plays a line back to the engine
  emit(line: string): void
  // reports a transport failure, as the worker's error event does
  fail(message: string): void
  readonly terminated: boolean
}

// The second adapter behind the transport seam. On its own it records commands and
// says nothing back; given a responder it answers like an engine would.
export function scriptedTransport(respond?: Responder): ScriptedTransport {
  const sent: string[] = []
  let lines: ((line: string) => void) | undefined
  let errors: ((message: string) => void) | undefined
  let terminated = false
  const emit = (line: string) => {
    if (!terminated) lines?.(line)
  }
  return {
    sent,
    emit,
    get terminated() {
      return terminated
    },
    send(cmd) {
      if (terminated) return
      sent.push(cmd)
      respond?.(cmd, emit)
    },
    onLine(handler) {
      lines = handler
    },
    onError(handler) {
      errors = handler
    },
    fail(message) {
      errors?.(message)
    },
    terminate() {
      terminated = true
    },
  }
}

// Gets the engine to 'ready' and then stays silent, so a test can time its own info lines.
export const uciHandshake: Responder = (cmd, emit) => {
  if (cmd === 'uci') emit('uciok')
  else if (cmd === 'isready') emit('readyok')
}

const STUB_DEPTH = 14
const STUB_LINES = [
  { cp: 25, pv: ['e2e4', 'e7e5', 'g1f3', 'b8c6'] },
  { cp: 12, pv: ['d2d4', 'd7d5', 'c2c4', 'e7e6'] },
  { cp: -5, pv: ['g1f3', 'd7d5', 'd2d4', 'g8f6'] },
]
const STUB_BESTMOVE = `bestmove ${STUB_LINES[0]!.pv[0]}`

// Reports the same evaluation for every position: enough for anything that needs an
// engine but not a real search. Scores are as UCI gives them, from the side to move.
export const stubEngine: Responder = (cmd, emit) => {
  uciHandshake(cmd, emit)
  if (cmd.startsWith('go')) {
    for (const [i, line] of STUB_LINES.entries())
      emit(`info depth ${STUB_DEPTH} multipv ${i + 1} score cp ${line.cp} pv ${line.pv.join(' ')}`)
    emit(STUB_BESTMOVE)
  } else if (cmd === 'stop') emit(STUB_BESTMOVE)
}
