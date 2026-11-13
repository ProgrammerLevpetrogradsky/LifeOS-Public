import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from 'react'
import { ArrowLeft, BookOpen, Folder, ImagePlus, Mic, MoreHorizontal, Pencil, Search, Sparkles, Square, Trash2, X } from 'lucide-react'
import type { JournalEntry, JournalFolder, JournalFolderAppearance } from '../data'
import JournalFolders from './JournalFolders'
import EntryFolderDrag from './EntryFolderDrag'
import { FolderGlyph } from './FolderGlyph'
import { FolderSheet } from './FolderPicker'
import { JournalSheet } from './JournalSheet'
import UnifiedSearch from '../search/UnifiedSearch'
import { prepareJournalPhoto } from './photo'
import { groupJournalEntries, journalDate, journalTime } from './timeline'
import { dictationLanguages, useJournalDictation } from './useJournalDictation'
import './journal.css'

export interface JournalDraft {
  text: string
  photo?: string
}

interface JournalPageProps {
  onReturn: () => void
  returnLabel: string
  entries: JournalEntry[]
  folders: JournalFolder[]
  onSaveFolder: (name: string, appearance: JournalFolderAppearance, id?: string) => boolean
  onReorderFolders: (from: string, to: string) => boolean
  onDeleteFolder: (id: string) => boolean
  onMoveEntry: (id: string, folderId?: string) => boolean
  draft: JournalDraft
  onDraftChange: Dispatch<SetStateAction<JournalDraft>>
  linkedTaskTitle?: string
  onUnlinkTask?: () => void
  sessionPrompt: boolean
  onDismissPrompt: () => void
  onCreate: (draft: JournalDraft, folderId?: string) => boolean
  onEdit: (id: string, draft: JournalDraft) => boolean
  onDelete: (id: string) => boolean
  searchResult?: { id: string }
  onSelectSearchEntry: (id: string) => void
}

interface JournalFormProps {
  id: string
  draft: JournalDraft
  onDraftChange: Dispatch<SetStateAction<JournalDraft>>
  onSubmit: (draft: JournalDraft) => boolean
  folder?: JournalFolder
  linkedTaskTitle?: string
  onUnlinkTask?: () => void
  onCancel?: () => void
}

function JournalForm({ id, draft, onDraftChange, onSubmit, folder, linkedTaskTitle, onUnlinkTask, onCancel }: JournalFormProps) {
  const [photoError, setPhotoError] = useState('')
  const [saveError, setSaveError] = useState(false)
  const [loadingPhoto, setLoadingPhoto] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const dictation = useJournalDictation(text => {
    onDraftChange(current => ({
      ...current,
      text: current.text && !/\s$/.test(current.text) ? current.text + ' ' + text : current.text + text,
    }))
  })
  const dictating = dictation.status !== 'idle'
  const canSave = !loadingPhoto && (draft.text.trim().length > 0 || !!draft.photo)

  const attachPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    setPhotoError('')
    setLoadingPhoto(true)
    try {
      const photo = await prepareJournalPhoto(file)
      if (fileInput.current) onDraftChange(current => ({ ...current, photo }))
    } catch (error) {
      if (fileInput.current) setPhotoError(error instanceof Error ? error.message : 'This photo could not be opened.')
    } finally {
      if (fileInput.current) setLoadingPhoto(false)
    }
  }

  return (
    <form className={onCancel ? 'journal-form journal-form-edit' : 'journal-form journal-form-new'} onSubmit={event => {
      event.preventDefault()
      if (!canSave) return
      const saved = onSubmit({ ...draft, text: draft.text.trim() })
      setSaveError(!saved)
      if (saved) {
        dictation.reset()
        setPhotoError('')
      }
    }}>
      {linkedTaskTitle !== undefined && onUnlinkTask && <div className="journal-task-link">
        <span>Linked to: <strong>{linkedTaskTitle}</strong></span>
        <button type="button" className="journal-icon" aria-label="Unlink task" onClick={onUnlinkTask}><X size={17} aria-hidden="true" /></button>
      </div>}
      {!onCancel && <label htmlFor={id}>Brain dump</label>}
      {folder && <p className="journal-composer-folder"><FolderGlyph {...folder} size={14} /> Saving to {folder.name}</p>}
      <textarea
        id={id}
        aria-label={onCancel ? 'Entry text' : undefined}
        placeholder="Write whatever’s on your mind…"
        rows={onCancel ? 3 : 2}
        value={draft.text}
        onChange={event => {
          const text = event.currentTarget.value
          onDraftChange(current => ({ ...current, text }))
        }}
      />
      {draft.photo && (
        <div className="journal-photo-preview">
          <img src={draft.photo} alt="Attached photo preview" />
          <button type="button" className="journal-icon" disabled={loadingPhoto} onClick={() => onDraftChange(current => ({ text: current.text }))} aria-label="Remove attached photo"><X size={17} /></button>
        </div>
      )}
      {photoError && <p className="journal-photo-error" role="alert">{photoError}</p>}
      {dictation.message && <p className="journal-dictation-message" role="status">{dictation.message}</p>}
      {saveError && <p className="journal-photo-error" role="alert">Couldn’t save this entry. Your draft is still here.</p>}
      <div className="journal-form-actions">
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={attachPhoto} hidden />
        <button type="button" className="journal-icon journal-photo-action" aria-label={draft.photo ? 'Replace photo' : 'Attach photo'} disabled={loadingPhoto} onClick={() => fileInput.current?.click()}><ImagePlus size={19} /></button>
        {!onCancel && (
          <button
            type="button"
            className="journal-icon journal-voice-action"
            aria-label={dictation.status === 'listening' ? 'Stop dictation' : dictating ? 'Cancel dictation' : 'Start dictation'}
            data-listening={dictating}
            onClick={dictation.toggle}
          >
            {dictating ? <Square size={16} fill="currentColor" aria-hidden="true" /> : <Mic size={19} aria-hidden="true" />}
          </button>
        )}
        {!onCancel && !dictating && (
          <select
            className="journal-dictation-language"
            aria-label="Dictation language"
            value={dictation.language}
            onChange={event => {
              const selected = dictationLanguages.find(([code]) => code === event.currentTarget.value)
              if (selected) dictation.setLanguage(selected[0])
            }}
          >
            {dictationLanguages.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
        )}
        {dictation.status !== 'idle' && <span className="journal-local-note" role="status">
          {{
            starting: 'Starting microphone…',
            listening: 'Recording… Tap to finish.',
            preparing: 'Preparing dictation… The first time may take a minute.',
            transcribing: 'Turning speech into text…',
          }[dictation.status]}
        </span>}
        {loadingPhoto && <span className="journal-local-note" role="status">Preparing photo…</span>}
        {onCancel && <button type="button" className="journal-text-action" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="journal-save" disabled={!canSave} aria-label={onCancel ? 'Save changes' : 'Save entry'}>{onCancel ? 'Save changes' : 'Save'}</button>
      </div>
    </form>
  )
}

function JournalCard({ entry, folders, onEdit, onDelete, onMove, isSearchResult }: {
  entry: JournalEntry
  folders: JournalFolder[]
  onEdit: (draft: JournalDraft) => boolean
  onDelete: () => void
  onMove: (folderId?: string) => boolean
  isSearchResult: boolean
}) {
  const [action, setAction] = useState<'read' | 'edit' | 'delete'>('read')
  const folder = folders.find(folder => folder.id === entry.folderId)
  const [draft, setDraft] = useState<JournalDraft>({ text: entry.text, photo: entry.photo })
  const [expanded, setExpanded] = useState(false)
  const actionMenu = useRef<HTMLDetailsElement>(null)
  const editDialog = useRef<HTMLDialogElement>(null)
  const moveDialog = useRef<HTMLDialogElement>(null)
  const photoId = `journal-photo-${entry.id}`

  useLayoutEffect(() => {
    if (action !== 'edit') return
    editDialog.current?.showModal()
    editDialog.current?.querySelector('textarea')?.focus()
  }, [action])

  const startEditing = () => {
    if (actionMenu.current) {
      actionMenu.current.open = false
      actionMenu.current.querySelector('summary')?.focus()
    }
    setDraft({ text: entry.text, photo: entry.photo })
    setAction('edit')
  }

  const closeEditor = () => editDialog.current?.close()

  return (
    <article className="journal-entry" id={`journal-entry-${entry.id}`}
      tabIndex={isSearchResult ? -1 : undefined} data-search-result={isSearchResult || undefined}>
      <div className="journal-entry-content">
        {entry.photo && <button className="journal-thumbnail" type="button" onClick={() => setExpanded(value => !value)}
          aria-expanded={expanded} aria-controls={photoId} aria-label={expanded ? 'Hide entry photo' : 'View entry photo'}>
          <img src={entry.photo} alt="" loading="lazy" />
        </button>}
        <div className="journal-entry-copy">
          <div className="journal-entry-time">
            <time dateTime={entry.createdAt}>{journalTime(entry.createdAt)}</time>
            {entry.updatedAt && <span title={journalDate(entry.updatedAt)}>Edited</span>}
            {folder && <span className="journal-entry-folder"><FolderGlyph {...folder} size={12} />{folder.name}</span>}
          </div>
          {entry.text && <p>{entry.text}</p>}
        </div>
        {action !== 'delete' && folders.length > 0 && <EntryFolderDrag folders={folders} folderId={entry.folderId}
          onMove={onMove} onChooseFolder={() => {
            if (actionMenu.current) actionMenu.current.open = false
            moveDialog.current?.showModal()
          }} />}
        <details className="journal-entry-actions" ref={actionMenu} onKeyDown={event => {
          if (event.key === 'Escape' && actionMenu.current?.open) {
            actionMenu.current.open = false
            actionMenu.current.querySelector('summary')?.focus()
          }
        }}>
          <summary className="journal-icon" aria-label="Entry actions"><MoreHorizontal size={20} /></summary>
          <div className="journal-actions-popover">
            <button type="button" aria-haspopup="dialog" onClick={startEditing}><Pencil size={15} /> Edit entry</button>
            {folders.length > 0 && <button type="button" aria-haspopup="dialog" onClick={() => {
              if (actionMenu.current) {
                actionMenu.current.open = false
                actionMenu.current.querySelector('summary')?.focus()
              }
              moveDialog.current?.showModal()
            }}><Folder size={15} /> Move to folder</button>}
            <button type="button" onClick={() => {
              if (actionMenu.current) actionMenu.current.open = false
              setAction('delete')
            }}><Trash2 size={15} /> Delete entry</button>
          </div>
        </details>
      </div>
      {entry.photo && <div id={photoId} hidden={!expanded} className="journal-expanded-photo">
        {expanded && <img src={entry.photo} alt="Photo attached to this entry" />}
      </div>}
      {folders.length > 0 && <FolderSheet dialog={moveDialog} label="Move to folder"
        value={entry.folderId ?? ''} onChange={folderId => onMove(folderId || undefined)} options={[
          { value: '', label: 'No folder' },
          ...folders.map(folder => ({ value: folder.id, label: folder.name, folder })),
        ]} />}
      {action === 'delete' && (
        <div className="journal-delete-confirm">
          <span>Delete this entry?</span>
          <button type="button" onClick={() => setAction('read')}>Cancel</button>
          <button type="button" onClick={onDelete}>Delete</button>
        </div>
      )}
      <JournalSheet dialog={editDialog} label="Edit entry" closeLabel="Close entry editor" onClose={() => setAction('read')}>
        {action === 'edit' && <JournalForm id={`journal-edit-${entry.id}`} draft={draft} onDraftChange={setDraft}
          onSubmit={next => {
            const saved = onEdit(next)
            if (saved) closeEditor()
            return saved
          }} onCancel={closeEditor} />}
      </JournalSheet>
    </article>
  )
}

export default function JournalPage({
  onReturn, returnLabel,
  entries, folders, onSaveFolder, onReorderFolders, onDeleteFolder, onMoveEntry, draft, onDraftChange, linkedTaskTitle, onUnlinkTask, sessionPrompt, onDismissPrompt, onCreate, onEdit, onDelete, searchResult, onSelectSearchEntry,
}: JournalPageProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [folderFilter, setFolderFilter] = useState('all')
  const [notice, setNotice] = useState('')
  const currentFolder = folders.find(folder => `folder:${folder.id}` === folderFilter)
  const scopedEntries = folderFilter === 'unfiled'
    ? entries.filter(entry => !entry.folderId)
    : currentFolder ? entries.filter(entry => entry.folderId === currentFolder.id) : entries
  const groups = groupJournalEntries(scopedEntries, '')
  const resultCount = scopedEntries.length

  useEffect(() => {
    if (sessionPrompt) window.scrollTo(0, 0)
  }, [sessionPrompt])

  useEffect(() => {
    if (!searchResult) return
    const card = document.getElementById(`journal-entry-${searchResult.id}`)
    card?.focus({ preventScroll: true })
    card?.scrollIntoView({ block: 'center' })
  }, [searchResult])

  return (
    <main className="journal-page">
      <header className="journal-title">
        <div className="journal-title-heading">
          <button type="button" className="journal-icon journal-search-toggle" aria-label={returnLabel} onClick={onReturn}>
            <ArrowLeft size={21} aria-hidden="true" />
          </button>
          <h1>Journal</h1>
        </div>
        <button type="button" className="journal-icon journal-search-toggle" aria-label="Search journal"
          aria-haspopup="dialog" onClick={() => setSearchOpen(true)}>
          <Search size={21} aria-hidden="true" />
        </button>
      </header>
      <UnifiedSearch journalOnly open={searchOpen} entries={entries} onClose={() => setSearchOpen(false)}
        onSelectEntry={id => {
          if (!scopedEntries.some(entry => entry.id === id)) setFolderFilter('all')
          onSelectSearchEntry(id)
        }} />
      {sessionPrompt && (
        <div className="journal-session-prompt" role="status">
          <Sparkles size={17} aria-hidden="true" />
          <span>Session saved. Want to capture a thought while it’s fresh?</span>
          <button className="journal-icon" type="button" onClick={onDismissPrompt} aria-label="Dismiss prompt"><X size={17} /></button>
        </div>
      )}
      <JournalForm id="journal-entry" draft={draft} onDraftChange={onDraftChange} folder={currentFolder}
        linkedTaskTitle={linkedTaskTitle} onUnlinkTask={onUnlinkTask} onSubmit={next => {
        const saved = onCreate(next, currentFolder?.id)
        if (saved) setNotice('Entry saved.')
        return saved
      }} />
      <JournalFolders folders={folders} entries={entries} filter={currentFolder || folderFilter === 'unfiled' ? folderFilter : 'all'}
        onFilterChange={setFolderFilter} onSave={onSaveFolder} onReorder={onReorderFolders} onDelete={id => {
          const deleted = onDeleteFolder(id)
          if (deleted && currentFolder?.id === id) setFolderFilter('unfiled')
          return deleted
        }} />
      <section className="journal-timeline" aria-labelledby="journal-timeline-title">
        <header className="journal-timeline-heading">
          <h2 id="journal-timeline-title">Entries</h2>
          <span className="journal-entry-count" aria-live="polite">{resultCount} {resultCount === 1 ? 'entry' : 'entries'}</span>
        </header>
        <span className="journal-sr-only" role="status">{notice}</span>
        {groups.length === 0 ? (
          <div className="journal-timeline-empty">
            <BookOpen size={23} aria-hidden="true" />
            <p>{folderFilter === 'unfiled' || currentFolder ? 'No entries here yet.' : 'Your entries will appear here.'}</p>
          </div>
        ) : groups.map(group => (
          <section className="journal-day" key={group.key}>
            <h3>{group.label}</h3>
            <div className="journal-day-entries">
              {group.entries.map(entry => (
                <JournalCard key={entry.id} entry={entry} folders={folders} onMove={folderId => {
                  const saved = onMoveEntry(entry.id, folderId)
                  if (saved) setNotice('Entry moved.')
                  return saved
                }} isSearchResult={searchResult?.id === entry.id} onEdit={next => {
                  if (!onEdit(entry.id, next)) return false
                  setNotice('Entry updated.')
                  return true
                }} onDelete={() => {
                  onDelete(entry.id)
                }} />
              ))}
            </div>
          </section>
        ))}
      </section>
    </main>
  )
}
