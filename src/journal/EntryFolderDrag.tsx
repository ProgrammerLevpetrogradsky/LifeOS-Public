import { FolderOpen, GripVertical } from 'lucide-react'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import type { JournalFolder } from '../data'
import { FolderGlyph } from './FolderGlyph'

interface EntryFolderDragProps {
  folders: JournalFolder[]
  folderId?: string
  onMove: (folderId?: string) => boolean
  onChooseFolder: () => void
}

export default function EntryFolderDrag({ folders, folderId, onMove, onChooseFolder }: EntryFolderDragProps) {
  const targets = useRef<HTMLUListElement>(null)
  const pointer = useRef<{ id: number; startX: number; startY: number; x: number; y: number; moved: boolean } | undefined>(undefined)
  const frame = useRef(0)
  const suppressClick = useRef(false)
  const [dragging, setDragging] = useState(false)
  const [destination, setDestination] = useState<string>()
  const [failed, setFailed] = useState(false)

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  function clearDrag() {
    pointer.current = undefined
    cancelAnimationFrame(frame.current)
    setDragging(false)
    setDestination(undefined)
  }

  function destinationAt(x: number, y: number) {
    const item = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-entry-folder-destination]')
    return item && targets.current?.contains(item) ? item.dataset.entryFolderDestination : undefined
  }

  function scrollTargets() {
    const list = targets.current
    const point = pointer.current
    if (!point) return
    if (list && list.scrollHeight > list.clientHeight) {
      const { left, right, top, bottom } = list.getBoundingClientRect()
      if (point.x >= left && point.x <= right && point.y >= top && point.y <= bottom) {
        const edge = 36
        const speed = Math.max(0, point.y - bottom + edge) - Math.max(0, top + edge - point.y)
        const previous = list.scrollTop
        if (speed) list.scrollTop += speed / 5
        if (list.scrollTop !== previous) setDestination(destinationAt(point.x, point.y))
      }
    }
    frame.current = requestAnimationFrame(scrollTargets)
  }

  function pointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0 || pointer.current) return
    suppressClick.current = false
    setFailed(false)
    event.currentTarget.setPointerCapture(event.pointerId)
    pointer.current = {
      id: event.pointerId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, moved: false,
    }
  }

  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    const point = pointer.current
    if (point?.id !== event.pointerId) return
    point.x = event.clientX
    point.y = event.clientY
    if (!point.moved) {
      if (Math.hypot(point.x - point.startX, point.y - point.startY) < 6) return
      point.moved = true
      suppressClick.current = true
      setDragging(true)
      frame.current = requestAnimationFrame(scrollTargets)
    }
    setDestination(destinationAt(point.x, point.y))
  }

  return <>
    <button type="button" className="journal-icon journal-entry-grip" aria-label="Drag entry to a folder"
      aria-haspopup="dialog" data-dragging={dragging} title="Drag to a folder or press to choose"
      onPointerDown={pointerDown} onPointerMove={pointerMove}
      onPointerUp={event => {
        if (pointer.current?.id !== event.pointerId) return
        const target = pointer.current.moved ? destinationAt(event.clientX, event.clientY) : undefined
        clearDrag()
        if (target !== undefined && target !== (folderId ?? '')) setFailed(!onMove(target || undefined))
      }}
      onPointerCancel={clearDrag} onLostPointerCapture={clearDrag}
      onKeyDown={event => {
        if (event.key !== 'Escape' || !pointer.current) return
        clearDrag()
      }}
      onClick={event => {
        if (event.detail === 0 || !suppressClick.current) {
          setFailed(false)
          onChooseFolder()
        }
      }}>
      <GripVertical size={19} aria-hidden="true" />
    </button>
    {dragging && <div className="journal-entry-drop-tray" aria-hidden="true">
      <strong>Drop in a folder</strong>
      <ul ref={targets}>
        <li data-entry-folder-destination="" data-drop-active={destination === ''}>
          <FolderOpen size={17} aria-hidden="true" /><span>No folder</span>
        </li>
        {folders.map(folder => (
          <li key={folder.id} data-entry-folder-destination={folder.id} data-drop-active={destination === folder.id}>
            <FolderGlyph {...folder} /><span>{folder.name}</span>
          </li>
        ))}
      </ul>
    </div>}
    {failed && <p className="journal-entry-drop-error" role="alert">Couldn’t move this entry. Try again.</p>}
  </>
}
