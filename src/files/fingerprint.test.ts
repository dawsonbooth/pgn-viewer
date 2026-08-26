import { describe, expect, it } from 'vitest'
import { fingerprintFile } from './fingerprint'

describe('fingerprintFile', () => {
  it('is deterministic and independent of the file name', async () => {
    const a = await fingerprintFile(new File(['hello pgn'], 'a.pgn'))
    const b = await fingerprintFile(new File(['hello pgn'], 'renamed.pgn'))
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f]{32}$/)
  })

  it('samples head, tail and size: a mid-file edit is invisible, an appended byte is not', async () => {
    const big = new Uint8Array(300 * 1024)
    const a = await fingerprintFile(new Blob([big]))
    big[150 * 1024] = 1 // untouched by head/tail sampling, size unchanged
    const same = await fingerprintFile(new Blob([big]))
    expect(same).toBe(a)
    const longer = await fingerprintFile(new Blob([big, new Uint8Array(1)]))
    expect(longer).not.toBe(a)
    big[0] = 1
    expect(await fingerprintFile(new Blob([big]))).not.toBe(a)
  })
})
