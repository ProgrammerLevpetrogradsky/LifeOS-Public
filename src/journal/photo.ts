const photoPrefix = 'data:image/jpeg;base64,'
const maxPhotoBytes = 180_000
const maxPhotoEdge = 960
const maxInputBytes = 12 * 1024 * 1024
const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/webp']

// Read the dimensions before the compressed scan so restored photos cannot
// introduce an oversized image or point to a remote resource.
function hasBoundedJpegFrame(bytes: string): boolean {
  const byte = (index: number) => bytes.charCodeAt(index)
  if (bytes.length < 8 || byte(0) !== 255 || byte(1) !== 216 ||
    byte(bytes.length - 2) !== 255 || byte(bytes.length - 1) !== 217) return false
  let offset = 2
  let boundedFrame = false
  while (offset < bytes.length) {
    if (byte(offset++) !== 255) return false
    while (byte(offset) === 255) offset++
    const marker = byte(offset++)
    const size = byte(offset) * 256 + byte(offset + 1)
    if (!Number.isFinite(size) || size < 2 || offset + size > bytes.length) return false
    if (marker === 192 || marker === 193 || marker === 194) {
      if (boundedFrame || size < 8) return false
      const height = byte(offset + 3) * 256 + byte(offset + 4)
      const width = byte(offset + 5) * 256 + byte(offset + 6)
      if (!width || !height || width > maxPhotoEdge || height > maxPhotoEdge) return false
      boundedFrame = true
    }
    if (marker === 218) return boundedFrame && size >= 8 && offset + size < bytes.length - 2
    if (marker === 217) return false
    offset += size
  }
  return false
}

export function isJournalPhoto(value: unknown): value is string {
  if (typeof value !== 'string' || !value.startsWith(photoPrefix) ||
    value.length > photoPrefix.length + Math.ceil(maxPhotoBytes / 3) * 4) return false
  try {
    const base64 = value.slice(photoPrefix.length)
    const bytes = atob(base64)
    return bytes.length <= maxPhotoBytes && btoa(bytes) === base64 && hasBoundedJpegFrame(bytes)
  } catch {
    return false
  }
}

export async function prepareJournalPhoto(file: File): Promise<string> {
  if (!acceptedImageTypes.includes(file.type)) throw new Error('Choose a JPEG, PNG, or WebP photo.')
  if (file.size > maxInputBytes) throw new Error('Choose a photo smaller than 12 MB.')

  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const scale = Math.min(1, maxPhotoEdge / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error()
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    for (const quality of [0.82, 0.66, 0.48, 0.32]) {
      const photo = canvas.toDataURL('image/jpeg', quality)
      if (isJournalPhoto(photo)) return photo
    }
  } catch {
    throw new Error('This photo could not be opened. Try a different file.')
  } finally {
    URL.revokeObjectURL(url)
  }
  throw new Error('This photo could not be reduced enough to save. Try a smaller image.')
}
