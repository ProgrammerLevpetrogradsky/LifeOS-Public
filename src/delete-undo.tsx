import { useEffect, useState, type RefObject } from 'react'
import type { JournalEntry, LifeOSData, Task } from './data'
import { todayTaskLimit } from './task-rules'
import './delete-undo.css'

type Position = { index: number; before?: string; after?: string }
type DeletedItem = Position & { expiresAt: number } & (
  | { kind: 'task'; item: Task }
  | { kind: 'journal'; item: JournalEntry }
)

const undoWindowMs = 8_000

function positionOf(items: { id: string }[], index: number): Position {
  return { index, before: items[index - 1]?.id, after: items[index + 1]?.id }
}

function restoreAtPosition<T extends { id: string }>(items: T[], item: T, position: Position): T[] {
  if (items.some(existing => existing.id === item.id)) return items
  const afterIndex = items.findIndex(existing => existing.id === position.after)
  const beforeIndex = items.findIndex(existing => existing.id === position.before)
  const index = afterIndex !== -1 ? afterIndex : beforeIndex !== -1 ? beforeIndex + 1 : position.index
  return [...items.slice(0, index), item, ...items.slice(index)]
}

export function useDeleteUndo(
  dataRef: RefObject<LifeOSData>,
  update: (change: (current: LifeOSData) => LifeOSData) => boolean,
) {
  const [deleted, setDeleted] = useState<DeletedItem[]>([])
  const [feedback, setFeedback] = useState('')
  const notice = deleted.at(-1)

  useEffect(() => {
    if (deleted.length === 0) return
    const delay = Math.max(0, Math.min(...deleted.map(entry => entry.expiresAt)) - Date.now())
    const timeout = window.setTimeout(() => {
      const now = Date.now()
      setDeleted(current => current.filter(entry => entry.expiresAt > now))
    }, delay)
    return () => window.clearTimeout(timeout)
  }, [deleted])

  useEffect(() => {
    if (!feedback) return
    const timeout = window.setTimeout(() => setFeedback(''), 4_000)
    return () => window.clearTimeout(timeout)
  }, [feedback])

  const remove = (kind: DeletedItem['kind'], id: string) => {
    const data = dataRef.current
    const items = kind === 'task' ? data.tasks : data.journal
    const index = items.findIndex(item => item.id === id)
    if (index === -1) return false
    if (!update(current => kind === 'task'
      ? { ...current, tasks: current.tasks.filter(item => item.id !== id) }
      : { ...current, journal: current.journal.filter(item => item.id !== id) })) return false

    const position = { ...positionOf(items, index), expiresAt: Date.now() + undoWindowMs }
    const entry: DeletedItem = kind === 'task'
      ? { ...position, kind, item: data.tasks[index] }
      : { ...position, kind, item: data.journal[index] }
    setFeedback('')
    setDeleted(current => [...current, entry])
    return true
  }

  const undoDeletion = () => {
    if (!notice) return
    if (notice.expiresAt <= Date.now()) {
      setDeleted(current => current.filter(entry => entry !== notice))
      return
    }

    let message = notice.kind === 'task' ? 'Task restored.' : 'Journal entry restored.'
    const saved = update(current => {
      if (notice.kind === 'journal') {
        const entry = notice.item.folderId && !current.journalFolders?.some(folder => folder.id === notice.item.folderId)
          ? { ...notice.item, folderId: undefined }
          : notice.item
        return { ...current, journal: restoreAtPosition(current.journal, entry, notice) }
      }
      const todayIsFull = current.tasks.filter(task => task.completedAt === null &&
        (task.list ?? 'today') === 'today').length >= todayTaskLimit
      const moveToSomeday = notice.item.completedAt === null &&
        (notice.item.list ?? 'today') === 'today' && todayIsFull
      const task = moveToSomeday ? { ...notice.item, list: 'someday' as const } : notice.item
      if (moveToSomeday) message = 'Task restored to Someday because Today is full.'
      return { ...current, tasks: restoreAtPosition(current.tasks, task, notice) }
    })
    if (!saved) {
      setFeedback('Could not restore this item. Try Undo again.')
      return
    }
    setDeleted(current => current.filter(entry => entry !== notice))
    setFeedback(message)
  }

  return {
    deleteTask: (id: string) => remove('task', id),
    deleteJournalEntry: (id: string) => remove('journal', id),
    clearUndo: () => { setDeleted([]); setFeedback('') },
    undoNotice: <DeleteUndoNotice kind={notice?.kind} feedback={feedback} onUndo={undoDeletion} />,
  }
}

function DeleteUndoNotice({ kind, feedback, onUndo }: {
  kind?: DeletedItem['kind']
  feedback: string
  onUndo: () => void
}) {
  const deletion = kind === 'task' ? 'Task deleted.' : kind === 'journal' ? 'Journal entry deleted.' : ''
  return (
    <>
      <span className="delete-undo-status" role="status" aria-atomic="true">{[deletion, feedback].filter(Boolean).join(' ')}</span>
      {(kind || feedback) && <aside className="delete-undo" aria-label="Deletion notice">
        <div>
          {deletion && <p>{deletion}</p>}
          {feedback && <p>{feedback}</p>}
        </div>
        {kind && <button type="button" onClick={onUndo}>Undo</button>}
      </aside>}
    </>
  )
}
