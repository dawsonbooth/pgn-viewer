const PICKER_TYPES = [
  {
    description: 'PGN files',
    accept: { 'application/x-chess-pgn': ['.pgn'], 'text/plain': ['.pgn', '.txt'] },
  },
]

declare global {
  interface Window {
    showOpenFilePicker?: (options?: unknown) => Promise<FileSystemFileHandle[]>
  }
}

const supportsFilePicker = () =>
  typeof window !== 'undefined' && typeof window.showOpenFilePicker === 'function'

// File System Access API where available, else an <input type=file>. undefined on cancel.
export async function pickPgnFile(): Promise<File | undefined> {
  if (supportsFilePicker()) {
    try {
      const [handle] = await window.showOpenFilePicker!({ types: PICKER_TYPES, multiple: false })
      return handle ? await handle.getFile() : undefined
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return undefined
    }
  }
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pgn,.txt,application/x-chess-pgn,text/plain'
    input.style.display = 'none'
    input.addEventListener('change', () => {
      resolve(input.files?.[0])
      input.remove()
    })
    input.addEventListener('cancel', () => {
      resolve(undefined)
      input.remove()
    })
    document.body.append(input)
    input.click()
  })
}

export function fileFromDrop(e: DragEvent): File | undefined {
  const files = e.dataTransfer?.files
  if (!files?.length) return undefined
  return [...files].find(f => /\.(pgn|txt)$/i.test(f.name)) ?? files[0]
}
