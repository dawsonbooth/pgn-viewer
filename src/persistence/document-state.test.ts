import { describe, expect, it } from 'vitest'
import { loadDocumentState, saveDocumentState, type DocumentState } from './document-state'

describe('document state (IndexedDB)', () => {
  it('round-trips per-fingerprint state', async () => {
    const key = `test-${Math.random().toString(36).slice(2)}`
    expect(await loadDocumentState(key)).toBeUndefined()
    const state: DocumentState = {
      selectedGame: 42,
      gamePositions: { 42: 7 },
      continuationVisibility: false,
      commentaryVisibility: true,
      boardOrientation: 'black',
      updatedAt: 1,
    }
    await saveDocumentState(key, state)
    expect(await loadDocumentState(key)).toEqual(state)
    await saveDocumentState(key, { ...state, selectedGame: 1 })
    expect((await loadDocumentState(key))?.selectedGame).toBe(1)
  })
})
