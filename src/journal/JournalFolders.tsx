import { Archive, Check, ChevronRight, FolderOpen, FolderPlus, GripVertical, Pencil, Settings2, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import FolderPicker from './FolderPicker'
import { FolderGlyph, folderIconLabel } from './FolderGlyph'
import { journalFolderColors, journalFolderIcons, maxJournalFolderNameLength, type JournalEntry, type JournalFolder, type JournalFolderAppearance } from '../data'

interface JournalFoldersProps {
  folders: JournalFolder[]
  entries: JournalEntry[]
  filter: string
  onFilterChange: (filter: string) => void
  onSave: (name: string, appearance: JournalFolderAppearance, id?: string) => boolean
  onReorder: (from: string, to: string) => boolean
  onDelete: (id: string) => boolean
}

export default function JournalFolders({ folders, entries, filter, onFilterChange, onSave, onReorder, onDelete }: JournalFoldersProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [editor, setEditor] = useState<JournalFolderAppearance & { id?: string; name: string }>()
  const [deleting, setDeleting] = useState<JournalFolder>()
  const [error, setError] = useState('')
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null)
  const scrollFrame = useRef(0)
  const [dragging, setDragging] = useState<string>()
  const [dropTarget, setDropTarget] = useState<string>()
  const [orderStatus, setOrderStatus] = useState<{ saved: boolean; message: string }>()
  const draggedIndex = folders.findIndex(folder => folder.id === dragging)
  const counts = new Map<string, number>()
  for (const entry of entries) {
    if (entry.folderId) counts.set(entry.folderId, (counts.get(entry.folderId) ?? 0) + 1)
  }

  useEffect(() => () => cancelAnimationFrame(scrollFrame.current), [])

  const clearDrag = () => {
    pointer.current = null
    cancelAnimationFrame(scrollFrame.current)
    setDragging(undefined)
    setDropTarget(undefined)
  }

  const reorder = (folder: JournalFolder, target: string | undefined) => {
    if (!target || target === folder.id) return
    const position = folders.findIndex(item => item.id === target) + 1
    if (!position) return
    const saved = onReorder(folder.id, target)
    setOrderStatus({
      saved,
      message: saved
        ? `${folder.name} moved to position ${position} of ${folders.length}.`
        : 'Couldn’t save the folder order. Try again.',
    })
    return saved
  }

  const targetAt = (x: number, y: number) => {
    const row = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-journal-folder-id]')
    return row && dialog.current?.contains(row) ? row.dataset.journalFolderId : undefined
  }

  const scrollDuringDrag = () => {
    const sheet = dialog.current
    const point = pointer.current
    if (!sheet || !point) return
    const bounds = sheet.getBoundingClientRect()
    if (point.x >= bounds.left && point.x <= bounds.right && point.y >= bounds.top && point.y <= bounds.bottom) {
      const edge = 48
      const speed = Math.max(0, point.y - (bounds.bottom - edge)) - Math.max(0, bounds.top + edge - point.y)
      const previous = sheet.scrollTop
      if (speed) sheet.scrollTop += speed / 4
      if (sheet.scrollTop !== previous) setDropTarget(targetAt(point.x, point.y))
    }
    scrollFrame.current = requestAnimationFrame(scrollDuringDrag)
  }

  const startDrag = (event: PointerEvent<HTMLButtonElement>, id: string) => {
    if (event.button !== 0 || pointer.current) return
    event.currentTarget.setPointerCapture(event.pointerId)
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
    setDragging(id)
    setOrderStatus(undefined)
    scrollFrame.current = requestAnimationFrame(scrollDuringDrag)
  }

  const updateDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (pointer.current?.id !== event.pointerId) return
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
    setDropTarget(targetAt(event.clientX, event.clientY))
  }

  const reset = () => {
    clearDrag()
    setOrderStatus(undefined)
    setEditor(undefined)
    setDeleting(undefined)
    setError('')
  }

  return <section className="journal-folders" aria-label="Journal folders">
    <div className="journal-folder-toolbar">
      <FolderPicker label="Show entries" value={filter} onChange={onFilterChange} options={[
        { value: 'all', label: 'All entries', icon: Archive },
        { value: 'unfiled', label: 'No folder', icon: FolderOpen },
        ...folders.map(folder => ({ value: `folder:${folder.id}`, label: folder.name, folder })),
      ]} />
      <button type="button" className="journal-folder-toggle" aria-label="Manage folders"
        aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>
        <Settings2 size={17} aria-hidden="true" /> Folders
      </button>
    </div>

    <dialog ref={dialog} className="journal-sheet journal-folder-manager" aria-labelledby="journal-folder-manager-title"
      onClose={reset} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close() }}>
      <div className="journal-folder-manager-body">
        <header>
          <h2 id="journal-folder-manager-title">{editor ? (editor.id ? 'Edit folder' : 'New folder') : deleting ? 'Delete folder' : 'Folders'}</h2>
          <button type="button" className="journal-icon" aria-label="Close folders" onClick={() => dialog.current?.close()}>
            <X size={19} aria-hidden="true" />
          </button>
        </header>

        {!editor && !deleting && <>
          <div className="journal-folder-list">
            {folders.map((folder, index) => {
              const value = `folder:${folder.id}`
              const count = counts.get(folder.id) ?? 0
              const isDropTarget = dropTarget === folder.id && dragging !== folder.id
              const dropBefore = draggedIndex > index
              return <div className="journal-folder-row" key={folder.id} data-journal-folder-id={folder.id}
                data-dragging={dragging === folder.id}
                data-drop={isDropTarget ? (dropBefore ? 'before' : 'after') : undefined}>
                {folders.length > 1 && <button type="button" className="journal-icon journal-folder-grip"
                  aria-label={`Reorder folder ${folder.name}`} aria-keyshortcuts="ArrowUp ArrowDown"
                  title="Drag to reorder or use Up and Down"
                  onPointerDown={event => startDrag(event, folder.id)} onPointerMove={updateDrag}
                  onPointerUp={event => {
                    if (pointer.current?.id !== event.pointerId) return
                    reorder(folder, targetAt(event.clientX, event.clientY))
                    clearDrag()
                  }}
                  onPointerCancel={clearDrag} onLostPointerCapture={clearDrag}
                  onKeyDown={event => {
                    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
                    event.preventDefault()
                    const handle = event.currentTarget
                    const target = folders[index + (event.key === 'ArrowUp' ? -1 : 1)]?.id
                    if (reorder(folder, target)) requestAnimationFrame(() => handle.focus())
                  }}>
                  <GripVertical size={18} aria-hidden="true" />
                </button>}
                <button type="button" className="journal-folder-open" aria-label={`Open folder ${folder.name}`}
                  aria-pressed={value === filter} onClick={() => { onFilterChange(value); dialog.current?.close() }}>
                  <FolderGlyph {...folder} />
                  <span className="journal-folder-name">
                    <strong>{folder.name}</strong>
                    <small>{count} {count === 1 ? 'entry' : 'entries'}</small>
                  </span>
                  <ChevronRight size={15} aria-hidden="true" />
                </button>
                <button type="button" className="journal-icon" aria-label={`Edit folder ${folder.name}`}
                  onClick={() => setEditor(folder)}><Pencil size={16} aria-hidden="true" /></button>
                <button type="button" className="journal-icon journal-folder-delete" aria-label={`Delete folder ${folder.name}`}
                  onClick={() => setDeleting(folder)}><Trash2 size={16} aria-hidden="true" /></button>
              </div>
            })}
          </div>
          <p className={orderStatus?.saved === false ? 'journal-photo-error' : 'journal-sr-only'} role="status">
            {orderStatus?.message}
          </p>
          <button type="button" className="journal-folder-button journal-folder-add" onClick={() => setEditor({ name: '' })}>
            <FolderPlus size={18} aria-hidden="true" /> New folder
          </button>
        </>}

        {editor && <form className="journal-folder-editor" onSubmit={event => {
          event.preventDefault()
          const name = editor.name.trim()
          if (!name) return
          if (folders.some(folder => folder.id !== editor.id && folder.name.toLowerCase() === name.toLowerCase())) {
            setError('A folder with that name already exists.')
            return
          }
          const { color, icon } = editor
          if (onSave(name, { color, icon }, editor.id)) reset()
        }}>
          <label htmlFor="journal-folder-name">Folder name</label>
          <input id="journal-folder-name" autoFocus value={editor.name} maxLength={maxJournalFolderNameLength}
            onChange={event => {
              setError('')
              setEditor({ ...editor, name: event.currentTarget.value })
            }} />
          <fieldset className="journal-folder-options">
            <legend>Color</legend>
            <div className="journal-folder-choices">
              {journalFolderColors.map(color => {
                const selected = (editor.color ?? 'blue') === color
                return <button key={color} type="button" className="journal-folder-choice journal-folder-swatch"
                  data-folder-color={color} aria-label={color[0].toUpperCase() + color.slice(1)}
                  aria-pressed={selected} onClick={() => setEditor({ ...editor, color })}>
                  {selected && <Check size={18} aria-hidden="true" />}
                </button>
              })}
            </div>
          </fieldset>
          <fieldset className="journal-folder-options">
            <legend>Icon</legend>
            <div className="journal-folder-choices">
              {journalFolderIcons.map(icon => <button key={icon} type="button" className="journal-folder-choice"
                aria-label={folderIconLabel(icon)} aria-pressed={(editor.icon ?? 'folder') === icon}
                onClick={() => setEditor({ ...editor, icon })}>
                <FolderGlyph color={editor.color} icon={icon} />
              </button>)}
            </div>
          </fieldset>
          {error && <p className="journal-photo-error" role="alert">{error}</p>}
          <div className="journal-folder-actions">
            <button type="button" className="journal-text-action" onClick={reset}>Cancel</button>
            <button type="submit" className="journal-folder-button" disabled={!editor.name.trim()}>{editor.id ? 'Save changes' : 'Create folder'}</button>
          </div>
        </form>}

        {deleting && <div className="journal-folder-editor">
          <p>Delete “{deleting.name}”? Its entries will move to No folder.</p>
          <div className="journal-folder-actions">
            <button type="button" className="journal-text-action" onClick={reset}>Cancel</button>
            <button type="button" className="journal-folder-button journal-folder-delete" onClick={() => {
              if (onDelete(deleting.id)) dialog.current?.close()
            }}>Delete folder</button>
          </div>
        </div>}
      </div>
    </dialog>
  </section>
}
