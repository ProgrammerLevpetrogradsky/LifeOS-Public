import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, Check, ChevronRight, Circle, ClipboardList, GripHorizontal, History, ListTodo, MessageCircle, Pause, Pencil, Play, Plus, Search, Settings2, Trash2, X } from 'lucide-react'
import { taskLists, type LifeOSData, type Task, type TaskList } from './data'
import { todayTaskLimit } from './task-rules'
import { JournalSheet } from './journal/JournalSheet'
import './main-dashboard.css'

interface MainDashboardProps {
  initialScreen?: 'home' | 'tasks'
  onReturnHome?: () => void
  returnLabel: string
  showTasksShortcut: boolean
  showFocusShortcut: boolean
  searchIncludesJournal: boolean
  tasks: Task[]
  pausedTaskTitle?: string
  displayName?: string
  onResume: () => void
  onFinishPaused: () => void
  onUpdate: (change: (current: LifeOSData) => LifeOSData) => boolean
  onOpenTask: (taskId: string) => void
  onDeleteTask: (id: string) => boolean
  onStart: (task: Task) => void
  onStartOpenFocus: () => void
  onJournal?: () => void
  onReflect?: () => void
  onFocusHistory: () => void
  onSettings: () => void
  onSearch: () => void
}

const listLabels: Record<TaskList, string> = { today: 'Today', someday: 'Someday' }
const taskList = (task: Task): TaskList => task.list ?? 'today'

type TaskEditor = { id: string | null; title: string; list: TaskList }

function greeting(hour: number) {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function MainDashboard({ initialScreen = 'home', onReturnHome, returnLabel, showTasksShortcut, showFocusShortcut, searchIncludesJournal, tasks, pausedTaskTitle, displayName, onResume, onFinishPaused, onUpdate, onOpenTask, onDeleteTask, onStart, onStartOpenFocus, onJournal, onReflect, onFocusHistory, onSettings, onSearch }: MainDashboardProps) {
  const [screen, setScreen] = useState(initialScreen)
  const [filter, setFilter] = useState<TaskList | 'completed'>('today')
  const [editor, setEditor] = useState<TaskEditor | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [actions, setActions] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [orderStatus, setOrderStatus] = useState('')
  const heading = useRef<HTMLHeadingElement>(null)
  const editorDialog = useRef<HTMLDialogElement>(null)
  const editorInput = useRef<HTMLInputElement>(null)
  const previousScreen = useRef(screen)
  const editing = editor !== null

  useLayoutEffect(() => {
    const dialog = editorDialog.current
    if (!dialog) return
    if (editing && !dialog.open) {
      dialog.showModal()
      editorInput.current?.focus()
    } else if (!editing && dialog.open) {
      dialog.close()
    }
  }, [screen, editing])

  const now = new Date()
  const today = now.toDateString()
  const active = tasks.filter(task => task.completedAt === null)
  const activeToday = active.filter(task => taskList(task) === 'today')
  const completed = tasks.filter(task => task.completedAt !== null)
    .sort((a, b) => Date.parse(b.completedAt!) - Date.parse(a.completedAt!))
  const doneToday = completed.filter(task => taskList(task) === 'today' && new Date(task.completedAt!).toDateString() === today)
  const nextTask = activeToday[0]
  const todayIsFull = activeToday.length >= todayTaskLimit
  const totalToday = activeToday.length + doneToday.length
  const editorTask = editor?.id ? tasks.find(task => task.id === editor.id) : undefined
  const cannotAddToToday = todayIsFull && !(editorTask && (editorTask.completedAt || taskList(editorTask) === 'today'))
  const visibleActive = filter === 'completed' ? [] : active.filter(task => taskList(task) === filter)

  useEffect(() => {
    if (previousScreen.current === screen) return
    previousScreen.current = screen
    window.scrollTo({ top: 0, behavior: 'instant' })
    if (!editor) heading.current?.focus({ preventScroll: true })
  }, [screen, editor])

  const showList = (list: TaskList | 'completed') => {
    setFilter(list)
    setEditor(null)
    setActions(null)
    setDeleting(null)
    setOrderStatus('')
  }

  const addTo = (list: TaskList) => {
    if (list === 'today' && todayIsFull) return
    showList(list)
    setEditor({ id: null, title: '', list })
  }

  const openTasks = (add = false) => {
    showList('today')
    setScreen('tasks')
    if (add) addTo(todayIsFull ? 'someday' : 'today')
  }

  const saveTask = (event: FormEvent) => {
    event.preventDefault()
    if (!editor || !editor.title.trim() || (editor.list === 'today' && cannotAddToToday)) return
    const { id, list } = editor
    const title = editor.title.trim()
    const saved = onUpdate(current => {
      if (!id) {
        const task = { id: crypto.randomUUID(), title, list, createdAt: new Date().toISOString(), completedAt: null }
        return { ...current, tasks: [task, ...current.tasks] }
      }

      const original = current.tasks.find(task => task.id === id)
      if (!original) return current
      const updated = { ...original, title, list }
      const tasks = taskList(original) === list
        ? current.tasks.map(task => task.id === id ? updated : task)
        : [...current.tasks.filter(task => task.id !== id), updated]
      return { ...current, tasks }
    })
    if (saved) showList(editorTask?.completedAt ? 'completed' : list)
  }

  const cannotReopen = (task: Task) => Boolean(task.completedAt && taskList(task) === 'today' && todayIsFull)

  const toggleTask = (task: Task) => {
    if (cannotReopen(task)) return
    const completedAt = task.completedAt ? null : new Date().toISOString()
    if (onUpdate(current => ({
      ...current,
      tasks: current.tasks.map(item => item.id === task.id ? { ...item, completedAt } : item),
    }))) {
      setActions(null)
      setDeleting(null)
      if (filter === 'completed') showList(taskList(task))
    }
  }

  const reorder = (from: string, to: string) => {
    const position = visibleActive.findIndex(task => task.id === to)
    const task = visibleActive.find(task => task.id === from)
    if (!task || position < 0 || from === to) return
    if (onUpdate(current => {
      const tasks = [...current.tasks]
      const fromIndex = tasks.findIndex(task => task.id === from)
      const toIndex = tasks.findIndex(task => task.id === to)
      if (fromIndex < 0 || toIndex < 0) return current
      const [moved] = tasks.splice(fromIndex, 1)
      tasks.splice(toIndex, 0, moved)
      return { ...current, tasks }
    })) setOrderStatus(`${task.title} moved to position ${position + 1}.`)
  }

  const clearDrag = () => {
    setDragging(null)
    setDropTarget(null)
  }

  const removeTask = (id: string) => {
    if (onDeleteTask(id)) setDeleting(null)
  }

  const breakCard = pausedTaskTitle !== undefined && (
    <section className="life-main-today life-main-break" aria-labelledby="life-main-break-title">
      <div className="life-main-break-heading">
        <Pause size={20} aria-hidden="true" />
        <div>
          <h2 id="life-main-break-title">On a break</h2>
          <p>{pausedTaskTitle}</p>
        </div>
      </div>
      <button type="button" className="life-main-primary" onClick={onResume}><Play size={16} fill="currentColor" /> Resume focus</button>
      <button type="button" className="life-main-text" onClick={onFinishPaused}>Finish session</button>
    </section>
  )

  if (screen === 'home') return <main className="life-main life-main-home">
    <header className="life-main-hero">
      <h1 ref={heading} tabIndex={-1}>{displayName?.trim() ? `Hey ${displayName.trim()}!` : greeting(now.getHours())}</h1>
      <div className="life-main-hero-actions">
        <button type="button" className="life-main-icon life-main-settings" aria-label={searchIncludesJournal ? 'Search tasks and journal' : 'Search tasks'}
          aria-haspopup="dialog" onClick={onSearch}><Search size={20} aria-hidden="true" /></button>
        <button type="button" className="life-main-icon life-main-settings" aria-label="Open settings" onClick={onSettings}><Settings2 size={20} /></button>
      </div>
    </header>

    <div className="life-main-stack">
      {breakCard || <section className="life-main-today" aria-labelledby="life-main-today">
        <div className="life-main-today-heading">
          <h2 id="life-main-today">Today</h2>
          {totalToday > 0 && <span>{doneToday.length} / {totalToday} done</span>}
        </div>
        {totalToday > 0 && <progress max={totalToday} value={doneToday.length} aria-label="Today’s task progress" />}
        {nextTask ? (
          <div className="life-main-next">
            <button type="button" className="life-main-complete" aria-label={`Complete ${nextTask.title}`} onClick={() => toggleTask(nextTask)}><Circle size={22} /></button>
            <div>
              <button type="button" className="life-main-task-link" aria-haspopup="dialog" onClick={() => onOpenTask(nextTask.id)}>
                <span>{nextTask.title}</span><ChevronRight size={16} aria-hidden="true" />
              </button>
              <p>Next up</p>
            </div>
            <button type="button" className="life-main-icon life-main-start-small" aria-label={`Start ${nextTask.title}`} onClick={() => onStart(nextTask)}>
              <Play size={17} fill="currentColor" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <p className="life-main-today-empty">{doneToday.length ? 'You’re all caught up' : 'No tasks for today'}</p>
        )}
      </section>}

      <button type="button" className="life-main-add-task" onClick={() => openTasks(true)}>
        <span className="life-main-shortcut-icon add"><Plus size={21} aria-hidden="true" /></span>
        <strong>Add a task</strong>
      </button>

      <nav className="life-main-shortcuts" aria-label="Home shortcuts">
        {showTasksShortcut && <button type="button" onClick={() => openTasks()}>
          <span className="life-main-shortcut-icon tasks"><ClipboardList size={21} aria-hidden="true" /></span>
          <strong>Tasks</strong>
        </button>}
        {onJournal && <button type="button" onClick={onJournal}>
          <span className="life-main-shortcut-icon journal"><BookOpen size={21} aria-hidden="true" /></span>
          <strong>Journal</strong>
        </button>}
        {showFocusShortcut && <button type="button" onClick={breakCard ? onResume : onStartOpenFocus}>
          <span className="life-main-shortcut-icon focus"><Play size={21} aria-hidden="true" /></span>
          <strong>{breakCard ? 'Resume Focus' : 'Start Focus'}</strong>
        </button>}
        {onReflect && <button type="button" onClick={onReflect}>
          <span className="life-main-shortcut-icon reflect"><MessageCircle size={21} aria-hidden="true" /></span>
          <strong>Reflect</strong>
        </button>}
      </nav>
      <button type="button" className="life-main-text life-main-history-link" onClick={onFocusHistory}>
        <History size={17} aria-hidden="true" /> Focus history <ChevronRight size={15} aria-hidden="true" />
      </button>
    </div>
  </main>

  const draggedIndex = visibleActive.findIndex(task => task.id === dragging)
  const visible = filter === 'completed' ? completed : filter === 'today' ? [...visibleActive, ...doneToday] : visibleActive
  const addList = filter === 'completed' ? (todayIsFull ? 'someday' : 'today') : filter
  const canAdd = filter !== 'today' || !todayIsFull

  return <main className="life-main life-main-tasks">
    <header className="life-main-tasks-header">
      <button type="button" className="life-main-icon" aria-label={returnLabel} onClick={() => {
        if (onReturnHome) onReturnHome()
        else { setScreen('home'); showList('today') }
      }}><ArrowLeft size={21} /></button>
      <h1 ref={heading} tabIndex={-1}>Tasks</h1>
      <button type="button" className="life-main-icon" aria-label="Add task" aria-haspopup="dialog" disabled={!canAdd} onClick={() => addTo(addList)}><Plus size={23} /></button>
    </header>

    {breakCard}

    <div className="life-main-filters" role="group" aria-label="Filter tasks">
      {taskLists.map(list => <button type="button" key={list} aria-pressed={filter === list} onClick={() => showList(list)}>{listLabels[list]}</button>)}
    </div>

    {filter === 'completed' && <h2 className="life-main-completed-title">Completed tasks</h2>}

    <JournalSheet dialog={editorDialog} label={editor?.id ? 'Edit task' : 'New task'} closeLabel="Close task editor"
      onClose={() => { if (!editorDialog.current?.open) setEditor(null) }}>
    {editor && <form className="life-main-editor" onSubmit={saveTask}>
      <label htmlFor="life-main-task-title" className="journal-sr-only">Task name</label>
      <input ref={editorInput} id="life-main-task-title" placeholder="Task name" maxLength={140} value={editor.title} onChange={event => setEditor({ ...editor, title: event.target.value })} />
      <span id="life-main-task-list-label" className="life-main-editor-label">List</span>
      <div className="life-main-filters life-main-editor-lists" role="group" aria-labelledby="life-main-task-list-label">
        {taskLists.map(list => {
          const full = list === 'today' && cannotAddToToday
          return <button type="button" key={list} aria-pressed={editor.list === list} disabled={full}
            onClick={() => setEditor({ ...editor, list })}>
            {listLabels[list]}{full ? ' (full)' : ''}
          </button>
        })}
      </div>
      <div className="life-main-editor-actions">
        <button type="button" className="life-main-text" onClick={() => editorDialog.current?.close()}>Cancel</button>
        <button type="submit" className="life-main-primary" disabled={!editor.title.trim() || (editor.list === 'today' && cannotAddToToday)}>{editor.id ? 'Save task' : 'Add task'}</button>
      </div>
    </form>}
    </JournalSheet>

    <p className="life-main-task-status" role="status">{orderStatus}</p>
    {visible.length ? <ul className="life-main-task-list">
      {visible.map(task => {
        const index = visibleActive.findIndex(item => item.id === task.id)
        const previous = index > 0 ? visibleActive[index - 1] : undefined
        const next = index >= 0 ? visibleActive[index + 1] : undefined
        const canReorder = index >= 0 && visibleActive.length > 1
        return <li className="life-main-task" key={task.id}
          data-drop-target={dropTarget === task.id ? (draggedIndex < index ? 'after' : 'before') : undefined}
          onDragOver={event => {
            if (!dragging) return
            if (dragging === task.id || index < 0) {
              setDropTarget(null)
              return
            }
            event.preventDefault()
            event.dataTransfer.dropEffect = 'move'
            setDropTarget(task.id)
          }}
          onDrop={event => {
            if (!dragging || index < 0) return
            event.preventDefault()
            reorder(dragging, task.id)
            clearDrag()
          }}>
          <div className="life-main-task-row">
            <button type="button" className="life-main-complete" disabled={cannotReopen(task)}
              title={cannotReopen(task) ? 'Move the task to another list or make space in Today' : undefined}
              aria-label={task.completedAt ? `Mark ${task.title} incomplete` : `Complete ${task.title}`}
              onClick={() => toggleTask(task)}>{task.completedAt ? <Check size={19} /> : <Circle size={22} />}</button>
            <span className="life-main-task-title">
              <button type="button" className="life-main-task-link" aria-haspopup="dialog" onClick={() => onOpenTask(task.id)}>
                <span>{task.title}</span><ChevronRight size={16} aria-hidden="true" />
              </button>
              {task.completedAt && <small>{listLabels[taskList(task)]} · {new Date(task.completedAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</small>}
            </span>
            {!task.completedAt && !breakCard && <button type="button" className="life-main-icon life-main-start-small" aria-label={`Start ${task.title}`} onClick={() => onStart(task)}><Play size={17} fill="currentColor" /></button>}
            <button type="button" className="life-main-icon life-main-task-actions-toggle" aria-label={`Actions for ${task.title}`}
              aria-expanded={actions === task.id} title={canReorder ? 'Task actions · drag to reorder' : 'Task actions'} draggable={canReorder}
              onClick={() => { setActions(actions === task.id ? null : task.id); setDeleting(null) }}
              onDragStart={event => {
                event.dataTransfer.setData('text/plain', task.id)
                event.dataTransfer.effectAllowed = 'move'
                setDragging(task.id)
              }}
              onDragEnd={clearDrag}><GripHorizontal size={21} /></button>
          </div>
          {actions === task.id && <div className="life-main-task-actions">
            <button type="button" className="life-main-text" aria-haspopup="dialog" onClick={event => {
              event.currentTarget.closest('.life-main-task')?.querySelector<HTMLButtonElement>('.life-main-task-actions-toggle')?.focus()
              setEditor({ id: task.id, title: task.title, list: taskList(task) })
              setActions(null)
            }}><Pencil size={15} /> Edit or move</button>
            {canReorder && <>
              <button type="button" className="life-main-text" aria-disabled={!previous} onClick={() => { if (previous) reorder(task.id, previous.id) }}><ArrowUp size={15} /> Move up</button>
              <button type="button" className="life-main-text" aria-disabled={!next} onClick={() => { if (next) reorder(task.id, next.id) }}><ArrowDown size={15} /> Move down</button>
            </>}
            <button type="button" className="life-main-text life-main-task-delete" onClick={() => { setDeleting(task.id); setActions(null) }}><Trash2 size={15} /> Delete</button>
          </div>}
          {deleting === task.id && <div className="life-main-delete">
            <span>Delete this task?</span>
            <button type="button" className="life-main-icon" aria-label="Cancel deletion" onClick={() => setDeleting(null)}><X size={16} /></button>
            <button type="button" className="life-main-text" onClick={() => removeTask(task.id)}>Delete task</button>
          </div>}
        </li>
      })}
    </ul> : <div className="life-main-tasks-empty">
      <ListTodo size={25} />
      <p>{filter === 'completed' ? 'Completed tasks will appear here.' : filter === 'today' ? 'No tasks for today.' : `No tasks in ${listLabels[filter]}.`}</p>
    </div>}

    {filter === 'today' && todayIsFull && <p className="life-main-limit">Today has five active tasks. Complete or move one to make space.</p>}
    {filter !== 'completed' && <div className="life-main-tasks-footer">
      {canAdd && <button type="button" className="life-main-text" aria-haspopup="dialog" onClick={() => addTo(filter)}><Plus size={18} /> Add a task <ArrowRight size={16} /></button>}
      <button type="button" className="life-main-text life-main-completed-link" onClick={() => showList('completed')}>Completed <span>{completed.length}</span></button>
    </div>}
  </main>
}
