import { BookOpen, ChevronRight, ListTodo, Search, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import type { JournalEntry, Task } from '../data'
import { journalDate, journalDayLabel } from '../journal/timeline'
import './search.css'

type UnifiedSearchProps = {
  open: boolean
  entries: JournalEntry[]
  onClose: () => void
  onSelectEntry: (id: string) => void
} & ({ journalOnly: true; tasks?: never; onSelectTask?: never; tasksOnly?: never } |
     { journalOnly?: false; tasks: Task[]; onSelectTask: (id: string) => void; tasksOnly?: boolean })

const taskLists = { today: 'Today', someday: 'Someday' }

function normalize(text: string): string {
  return text.toLocaleLowerCase().normalize('NFD').replace(/\p{Mark}/gu, '')
}

function excerpt(text: string, query: string): string {
  const line = text.trim().replace(/\s+/g, ' ')
  const match = normalize(line).indexOf(query)
  const start = match > 54 ? match - 38 : 0
  const end = start + 110
  return (start > 0 ? '…' : '') + line.slice(start, end) + (end < line.length ? '…' : '')
}

export default function UnifiedSearch({ open, journalOnly, tasksOnly, tasks, entries, onClose, onSelectTask, onSelectEntry }: UnifiedSearchProps) {
  const [query, setQuery] = useState('')
  const id = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean)
  const matches = (text: string) => terms.every(term => normalize(text).includes(term))
  const taskMatches = terms.length && tasks ? tasks.filter(task => matches(task.title)) : []
  const now = new Date()
  const entryMatches = terms.length ? entries.filter(entry => matches(journalOnly
    ? `${entry.text} ${journalDayLabel(new Date(entry.createdAt), now)} ${journalDate(entry.createdAt)}`
    : entry.text)) : []
  const resultCount = taskMatches.length + entryMatches.length
  const searchLabel = journalOnly ? 'Search journal entries' : tasksOnly ? 'Search tasks' : 'Search tasks and journal'

  useEffect(() => {
    const current = dialog.current
    if (!open || !current || current.open) return
    current.showModal()
    search.current?.focus()
  }, [open])

  const select = (id: string, onSelect: (id: string) => void) => {
    dialog.current?.close()
    onSelect(id)
  }

  return (
    <dialog ref={dialog} className="unified-search" aria-label={journalOnly ? 'Search journal' : 'Search'}
      onClose={() => { setQuery(''); onClose() }}
      onClick={event => {
        if (event.target !== event.currentTarget) return
        const { top, bottom, left, right } = event.currentTarget.getBoundingClientRect()
        if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) {
          event.currentTarget.close()
        }
      }}>
      <div className="unified-search-input">
        <Search size={20} aria-hidden="true" />
        <input ref={search} type="search" aria-label={searchLabel}
          placeholder={`${searchLabel}…`}
          value={query} onChange={event => setQuery(event.currentTarget.value)} />
        <button type="button" className="unified-search-close" aria-label="Close search" onClick={() => dialog.current?.close()}>
          <X size={22} aria-hidden="true" />
        </button>
      </div>
      {terms.length > 0 && <div className="unified-search-results">
        <p className="unified-search-status" role="status">
          {resultCount === 0 ? 'No matches. Try a different word.' :
            resultCount === 1 ? '1 match' : `${resultCount} matches`}
        </p>
        {onSelectTask && taskMatches.length > 0 && <section aria-labelledby={`${id}-tasks`}>
          <h3 id={`${id}-tasks`}><ListTodo size={17} aria-hidden="true" />Tasks</h3>
          <ul>{taskMatches.map(task => <li key={task.id}>
            <button type="button" onClick={() => select(task.id, onSelectTask)}>
              <span><strong>{task.title}</strong><small>{task.completedAt ? 'Completed' : taskLists[task.list ?? 'today']}</small></span>
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </li>)}</ul>
        </section>}
        {entryMatches.length > 0 && <section aria-labelledby={`${id}-journal`}>
          <h3 id={`${id}-journal`}><BookOpen size={17} aria-hidden="true" />Journal</h3>
          <ul>{entryMatches.map(entry => <li key={entry.id}>
            <button type="button" onClick={() => select(entry.id, onSelectEntry)}>
              <span><strong>{excerpt(entry.text, terms[0]) || 'Photo entry'}</strong><small>{journalDate(entry.createdAt)}</small></span>
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </li>)}</ul>
        </section>}
      </div>}
    </dialog>
  )
}
