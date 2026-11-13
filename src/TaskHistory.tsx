import { useEffect, useId, useRef, useState } from 'react'
import { BookOpen, Clock, PenLine, Play, X } from 'lucide-react'
import { sessionMinutes, type FocusSession, type JournalEntry, type Task } from './data'
import { journalDate, journalTime } from './journal/timeline'
import './task-history.css'

interface TaskHistoryProps {
  task: Task
  sessions: FocusSession[]
  entries: JournalEntry[]
  availableEntries: JournalEntry[]
  linksExistingDraft: boolean
  focusAction: 'start' | 'resume' | 'unavailable'
  focusMessage?: string
  onClose: () => void
  onFocus: () => void
  onLinkNote?: (id: string) => boolean
  onWriteReflection?: () => void
}

export default function TaskHistory({ task, sessions, entries, availableEntries, linksExistingDraft, focusAction, focusMessage, onClose, onFocus, onLinkNote, onWriteReflection }: TaskHistoryProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [choosingNote, setChoosingNote] = useState(false)
  const titleId = useId()
  const sessionHeadingId = useId()
  const journalHeadingId = useId()

  useEffect(() => {
    const element = dialog.current
    if (element && !element.open) element.showModal()
  }, [])

  return (
    <dialog ref={dialog} className="task-history" aria-labelledby={titleId} onClose={onClose}>
      <div className="task-history__body">
        <header className="task-history__header">
          <div>
            <p>Task history</p>
            <h2 id={titleId}>{task.title}</h2>
          </div>
          <form method="dialog">
            <button className="task-history__close" type="submit" aria-label="Close task history"><X size={20} aria-hidden="true" /></button>
          </form>
        </header>

        <section className="task-history__section" aria-labelledby={sessionHeadingId}>
          <h3 id={sessionHeadingId}><Clock size={17} aria-hidden="true" /> Focus sessions</h3>
          {sessions.length ? <ul>
            {sessions.map(session => <li className="task-history__session" key={session.id}>
              <time dateTime={session.endedAt}>{journalDate(session.endedAt)} · {journalTime(session.endedAt)}</time>
              <span>{sessionMinutes(session.durationMs)}</span>
            </li>)}
          </ul> : <p>No focus sessions for this task yet.</p>}
          <button className="task-history__action" type="button" disabled={focusAction === 'unavailable'} onClick={onFocus}>
            <Play size={16} aria-hidden="true" /> {focusAction === 'resume' ? 'Resume focus' : 'Start focus'}
          </button>
          {focusMessage && <p className="task-history__hint">{focusMessage}</p>}
        </section>

        <section className="task-history__section" aria-labelledby={journalHeadingId}>
          <h3 id={journalHeadingId}><BookOpen size={17} aria-hidden="true" /> Linked Journal notes</h3>
          {entries.length ? <ul>
            {entries.map(entry => <li className="task-history__note" key={entry.id}>
              <time dateTime={entry.createdAt}>{journalDate(entry.createdAt)} · {journalTime(entry.createdAt)}</time>
              {entry.text && <p>{entry.text}</p>}
              {entry.photo && <img src={entry.photo} alt="Photo attached to this entry" loading="lazy" />}
            </li>)}
          </ul> : <p>No Journal notes linked to this task yet.</p>}
          {onLinkNote && <>
            <button className="task-history__action" type="button" aria-expanded={choosingNote} aria-controls={`${journalHeadingId}-choices`}
              onClick={() => setChoosingNote(value => !value)}>
              <BookOpen size={16} aria-hidden="true" /> Link a note
            </button>
            {choosingNote && <div className="task-history__choices" id={`${journalHeadingId}-choices`}>
              {availableEntries.length ? <ul aria-label="Unlinked Journal notes">
                {availableEntries.map(entry => <li key={entry.id}>
                  <button type="button" onClick={() => { if (onLinkNote(entry.id)) setChoosingNote(false) }}>
                    <time dateTime={entry.createdAt}>{journalDate(entry.createdAt)} · {journalTime(entry.createdAt)}</time>
                    <span>{entry.text.trim() || (entry.photo ? 'Photo note' : 'Empty note')}</span>
                  </button>
                </li>)}
              </ul> : <p>No unlinked Journal notes available.</p>}
            </div>}
          </>}
        </section>

        {onWriteReflection && <button className="task-history__write" type="button" onClick={onWriteReflection}>
          <PenLine size={18} aria-hidden="true" />
          {linksExistingDraft ? 'Link draft to this task' : 'Write a reflection'}
        </button>}
      </div>
    </dialog>
  )
}
