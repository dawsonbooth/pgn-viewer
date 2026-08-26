export interface EngineLine {
  multipv: number
  depth: number
  // scores are from White's perspective
  cp?: number
  mate?: number
  pv: string[]
}

export interface EngineAnalysis {
  fen: string
  lines: EngineLine[]
  depth: number
}

export type EngineStatus = 'downloading' | 'loading' | 'ready' | 'thinking' | 'error'

export interface EngineOptions {
  multiPv?: number
  depth?: number
  onAnalysis: (analysis: EngineAnalysis) => void
  onStatus: (status: EngineStatus, detail?: string) => void
  // reports the one-time engine download; see engine/assets
  onProgress?: (loaded: number, total: number) => void
  // abandons that download if the engine is switched off mid-flight
  signal?: AbortSignal
}

// What the viewer needs from an engine, whatever is behind it.
export interface Engine {
  analyze(fen: string): void
  stop(): void
  terminate(): void
}

export type EngineFactory = (opts: EngineOptions) => Engine | Promise<Engine>

// UCI scores are relative to the side to move, so reading them needs the position.
export function sideToMove(fen: string): 'white' | 'black' {
  return fen.split(' ')[1] === 'b' ? 'black' : 'white'
}

export function parseInfo(line: string, side: 'white' | 'black'): EngineLine | undefined {
  if (!line.startsWith('info ') || !line.includes(' pv ') || !line.includes(' score '))
    return undefined
  const tokens = line.split(/\s+/)
  const out: EngineLine = { multipv: 1, depth: 0, pv: [] }
  const sign = side === 'white' ? 1 : -1
  for (let i = 1; i < tokens.length; i++) {
    const t = tokens[i]
    switch (t) {
      case 'depth':
        out.depth = Number(tokens[++i])
        break
      case 'multipv':
        out.multipv = Number(tokens[++i])
        break
      case 'score': {
        const kind = tokens[++i]
        const value = Number(tokens[++i])
        if (kind === 'cp') out.cp = value * sign
        else if (kind === 'mate') out.mate = value * sign
        break
      }
      case 'lowerbound':
      case 'upperbound':
        return undefined
      case 'pv':
        out.pv = tokens.slice(i + 1)
        i = tokens.length
        break
    }
  }
  return out
}

export function formatScore(line: Pick<EngineLine, 'cp' | 'mate'>): string {
  if (line.mate !== undefined) {
    if (line.mate === 0) return '#'
    return (line.mate > 0 ? '#' : '#-') + Math.abs(line.mate)
  }
  const pawns = (line.cp ?? 0) / 100
  const sign = pawns > 0 ? '+' : pawns < 0 ? '-' : ''
  return sign + Math.abs(pawns).toFixed(2)
}
