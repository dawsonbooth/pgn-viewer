// First and last 64 KiB plus the size. Name-independent, so a renamed file keeps its state.
const SLICE = 64 * 1024

export async function fingerprintFile(file: Blob): Promise<string> {
  const head = await file.slice(0, SLICE).arrayBuffer()
  const tail =
    file.size > SLICE
      ? await file.slice(Math.max(SLICE, file.size - SLICE)).arrayBuffer()
      : new ArrayBuffer(0)
  const sizeBytes = new TextEncoder().encode(String(file.size))
  const joined = new Uint8Array(head.byteLength + tail.byteLength + sizeBytes.byteLength)
  joined.set(new Uint8Array(head), 0)
  joined.set(new Uint8Array(tail), head.byteLength)
  joined.set(sizeBytes, head.byteLength + tail.byteLength)
  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', joined)
    return [...new Uint8Array(digest)]
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 32)
  }
  // no SubtleCrypto on plain http
  let h = 0x811c9dc5
  for (const b of joined) h = Math.imul(h ^ b, 0x01000193) >>> 0
  return `fnv-${h.toString(16)}-${file.size}`
}
