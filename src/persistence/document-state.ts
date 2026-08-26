export interface DocumentState {
  selectedGame: number
  gamePositions?: Record<number, number>
  continuationVisibility: boolean
  commentaryVisibility: boolean
  boardOrientation?: 'white' | 'black'
  updatedAt: number
}

const DB_NAME = 'pgn-viewer'
const STORE = 'documents'
let dbPromise: Promise<IDBDatabase | undefined> | undefined

function openDb(): Promise<IDBDatabase | undefined> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise(resolve => {
    if (typeof indexedDB === 'undefined') return resolve(undefined)
    try {
      const req = indexedDB.open(DB_NAME, 1)
      req.addEventListener('upgradeneeded', () => req.result.createObjectStore(STORE))
      req.addEventListener('success', () => resolve(req.result))
      req.addEventListener('error', () => resolve(undefined))
      req.addEventListener('blocked', () => resolve(undefined))
    } catch {
      resolve(undefined)
    }
  })
  return dbPromise
}

export async function loadDocumentState(fingerprint: string): Promise<DocumentState | undefined> {
  const db = await openDb()
  if (!db) return undefined
  return new Promise(resolve => {
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(fingerprint)
      req.addEventListener('success', () => resolve(req.result as DocumentState | undefined))
      req.addEventListener('error', () => resolve(undefined))
    } catch {
      resolve(undefined)
    }
  })
}

export async function saveDocumentState(fingerprint: string, state: DocumentState): Promise<void> {
  const db = await openDb()
  if (!db) return
  await new Promise<void>(resolve => {
    try {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(state, fingerprint)
      tx.addEventListener('complete', () => resolve())
      tx.addEventListener('error', () => resolve())
      tx.addEventListener('abort', () => resolve())
    } catch {
      resolve()
    }
  })
}

export function createStateSaver(delayMs = 400) {
  let timer: ReturnType<typeof setTimeout> | undefined
  return (fingerprint: string, state: DocumentState) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => void saveDocumentState(fingerprint, state), delayMs)
  }
}
