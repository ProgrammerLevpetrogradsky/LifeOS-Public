import type { ImportedNote, NoteBlock } from './data'

export interface SourceIndex {
  sourceName: string
  sha256: string
  blocks: { order: number; title: string; startByte: number }[]
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let index = 0; index < bytes.length; index += 8192) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 8192))
  }
  return btoa(binary)
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index)
  return bytes
}

export async function makeImportedNote(sourceName: string, sourceType: string, bytes: Uint8Array): Promise<ImportedNote> {
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes))
  const sha256 = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
  return {
    id: sha256,
    sourceName,
    sourceType,
    importedAt: new Date().toISOString(),
    sha256,
    byteLength: bytes.byteLength,
    rawSource: new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes),
    rawBytesBase64: bytesToBase64(bytes),
  }
}

export function buildNoteBlocks(note: ImportedNote, index: SourceIndex): NoteBlock[] | null {
  if (index.sourceName !== note.sourceName || index.sha256 !== note.sha256 || !Array.isArray(index.blocks) || !index.blocks.length) return null
  const starts = index.blocks.map(block => block.startByte)
  if (starts[0] !== 0 || starts.some((start, position) => !Number.isSafeInteger(start) || start < 0 || start >= note.byteLength || (position > 0 && start <= starts[position - 1]))) return null
  const orders = new Set<number>()
  const blocks = index.blocks.map((block, position) => {
    if (!Number.isSafeInteger(block.order) || block.order < 1 || orders.has(block.order) || typeof block.title !== 'string' || !block.title) return null
    orders.add(block.order)
    return { order: block.order, title: block.title, startByte: block.startByte, endByte: starts[position + 1] ?? note.byteLength }
  })
  return blocks.some(block => block === null) ? null : blocks as NoteBlock[]
}

export function noteBody(note: ImportedNote, block: NoteBlock): string {
  return new TextDecoder('utf-8', { ignoreBOM: true }).decode(base64ToBytes(note.rawBytesBase64).subarray(block.startByte, block.endByte))
}

export function downloadOriginal(note: ImportedNote): void {
  const bytes = base64ToBytes(note.rawBytesBase64)
  const blob = new Blob([new Uint8Array(bytes)], { type: note.sourceType || 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = note.sourceName
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
