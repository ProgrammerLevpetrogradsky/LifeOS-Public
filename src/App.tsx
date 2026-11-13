import MainDashboard from './MainDashboard'
import MainFocus from './MainFocus'
import TaskHistory from './TaskHistory'
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { ArrowRight, BookOpen, House, Leaf, MessageCircle, Settings2, Sparkles } from 'lucide-react'
import { focusedDuration, loadData, navigationSections, recordUnratedSession, restoreBackup, saveData, type Factor, type JournalFolderAppearance, type LifeOSData, type NavigationSection, type Task } from './data'
import { base64ToBytes, buildNoteBlocks, makeImportedNote, type SourceIndex } from './notes'
import JournalPage, { type JournalDraft } from './journal/JournalPage'
import FlowEnginePage from './flow/FlowEnginePage'
import BreakReminder from './settings/BreakReminder'
import SettingsPage from './settings/SettingsPage'
import { useDeleteUndo } from './delete-undo'
import UnifiedSearch from './search/UnifiedSearch'

type View = NavigationSection | 'settings'
const sectionIcons = { main: House, flow: MessageCircle, journal: BookOpen }
const factors: Factor[] = ['Meaningful Goal', 'Personal Control', 'Fast Feedback', 'Other']
const repoUrl = 'https://github.com/ProgrammerLevpetrogradsky/LifeOS-Public'

function App() {
  const [loadResult, setLoadResult] = useState(loadData)
  const data = loadResult.data
  const dataRef = useRef(data)
  const hiddenSections = data.hiddenSections ?? []
  const visibleSections = navigationSections.filter(section => section.id !== 'flow' && !hiddenSections.includes(section.id))
  const defaultView = visibleSections[0]?.id ?? 'settings'
  const [requestedView, setView] = useState<View>(defaultView)
  const view = requestedView === 'settings' || !hiddenSections.includes(requestedView) ? requestedView : defaultView
  const showHome = !hiddenSections.includes('main')
  const showJournal = !hiddenSections.includes('journal')
  const [searchOpen, setSearchOpen] = useState(false)
  const [journalSearchResult, setJournalSearchResult] = useState<{ id: string }>()
  const [storageError, setStorageError] = useState(false)
  const [showTime, setShowTime] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [interest, setInterest] = useState(0)
  const [continueDesire, setContinueDesire] = useState(0)
  const [progress, setProgress] = useState(0)
  const [selectedFactors, setSelectedFactors] = useState<Factor[]>([])
  const [taskHistoryId, setTaskHistoryId] = useState<string | null>(null)
  const [journalTaskId, setJournalTaskId] = useState<string | undefined>()
  const [journalDraft, setJournalDraft] = useState<JournalDraft>({ text: '' })
  const [journalPrompt, setJournalPrompt] = useState(false)
  const [backupMessage, setBackupMessage] = useState('')

  useEffect(() => {
    const selected = data.theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : data.theme
    document.documentElement.dataset.theme = selected
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => { if (data.theme === 'system') document.documentElement.dataset.theme = media.matches ? 'dark' : 'light' }
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [data.theme])
  useEffect(() => {
    if (!data.activeSession || data.activeSession.pausedAt) return
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [data.activeSession])

  const update = (change: (current: LifeOSData) => LifeOSData) => {
    if (loadResult.error) { setStorageError(true); return false }
    const next = change(dataRef.current)
    const persisted = saveData(next)
    setStorageError(!persisted)
    if (persisted) {
      dataRef.current = next
      setLoadResult({ data: next, error: null })
    }
    return persisted
  }

  const { deleteTask, deleteJournalEntry, clearUndo, undoNotice } = useDeleteUndo(dataRef, update)

  const importBytes = async (name: string, type: string, bytes: Uint8Array, index?: SourceIndex): Promise<boolean> => {
    const note = await makeImportedNote(name, type, bytes)
    const blocks = index ? buildNoteBlocks(note, index) : null
    if (blocks) note.noteBlocks = blocks
    const existing = dataRef.current.importedNotes.find(item => item.sha256 === note.sha256)
    if (existing) {
      if (existing.rawBytesBase64 !== note.rawBytesBase64) throw new Error('Stored source bytes differ from the original')
      if (blocks && JSON.stringify(existing.noteBlocks) !== JSON.stringify(blocks)) {
        if (!update(current => ({ ...current, importedNotes: current.importedNotes.map(item => item.id === existing.id ? { ...item, noteBlocks: blocks } : item) }))) throw new Error('Local storage is unavailable')
      }
      return false
    }
    if (!update(current => ({ ...current, importedNotes: [...current.importedNotes, note] }))) throw new Error('Local storage is unavailable')
    return true
  }

  useEffect(() => {
    let cancelled = false
    async function importLocalSources() {
      try {
        const response = await fetch('/__lifeos_local_notes', { cache: 'no-store' })
        if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return
        const sources = await response.json() as { name: string; type: string; bytesBase64: string; index?: SourceIndex }[]
        if (!Array.isArray(sources)) return
        for (const source of sources) {
          if (cancelled) return
          await importBytes(source.name, source.type, base64ToBytes(source.bytesBase64), source.index)
        }
      } catch { /* A production build has no private local seed endpoint. */ }
    }
    void importLocalSources()
    return () => { cancelled = true }
  }, [])

  const importBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const backupText = await file.text()
      const next = await restoreBackup(backupText, dataRef.current, localStorage, () => window.confirm('Replace your current tasks, sessions, journal, and settings with this backup? Any readable imported Notes will be kept. Unreadable saved data will be preserved for recovery.'))
      if (!next) return
      clearUndo()
      dataRef.current = next
      setLoadResult({ data: next, error: null })
      setStorageError(false)
      setBackupMessage('Backup restored. Readable imported Notes were kept; previous unreadable data was preserved for recovery.')
    } catch (error) {
      setBackupMessage(error instanceof Error ? error.message : 'Backup could not be restored.')
    } finally {
      event.target.value = ''
    }
  }

  const startFocus = (task?: Task) => {
    if (dataRef.current.activeSession || dataRef.current.pendingSession) return
    const now = Date.now()
    const started = update(current => ({
      ...current,
      activeSession: {
        id: crypto.randomUUID(),
        taskId: task?.id ?? null,
        taskTitle: task?.title ?? 'Open focus',
        startedAt: new Date(now).toISOString(),
      },
    }))
    if (started) {
      setNow(now)
      setShowTime(false)
    }
  }

  const pauseSession = () => {
    const session = dataRef.current.activeSession
    if (!session || session.pausedAt) return
    const pausedAt = new Date().toISOString()
    if (update(current => ({ ...current, activeSession: { ...session, pausedAt, breakReminderDismissed: undefined } }))) navigate('main')
  }

  const resumeSession = () => {
    const session = dataRef.current.activeSession
    if (!session?.pausedAt) return
    const now = Date.now()
    const pausedDurationMs = (session.pausedDurationMs ?? 0) + Math.max(0, now - Date.parse(session.pausedAt))
    if (update(current => ({
      ...current,
      activeSession: { ...session, pausedAt: undefined, pausedDurationMs, breakReminderDismissed: undefined },
    }))) {
      setNow(now)
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }

  const toggleFocusSilence = () => {
    const session = dataRef.current.activeSession
    if (!session || session.pausedAt) return
    update(current => ({
      ...current,
      activeSession: { ...session, silenceBreakReminders: !session.silenceBreakReminders },
    }))
  }

  const dismissBreakReminder = () => {
    const session = dataRef.current.activeSession
    if (!session?.pausedAt) return
    update(current => ({ ...current, activeSession: { ...session, breakReminderDismissed: true } }))
  }

  const endSession = () => {
    const current = dataRef.current
    if (!current.activeSession) return
    const finished = { ...current.activeSession, endedAt: new Date().toISOString() }
    if (current.focusCheckinEnabled === false) {
      if (update(data => recordUnratedSession({ ...data, activeSession: null }, finished))) navigate('main')
      return
    }
    if (!update(data => ({ ...data, activeSession: null, pendingSession: finished }))) return
    setInterest(0)
    setContinueDesire(0)
    setProgress(0)
    setSelectedFactors([])
  }

  const saveCheckin = (event: FormEvent) => {
    event.preventDefault()
    if (!interest || !continueDesire || !progress || !data.pendingSession) return
    const pending = data.pendingSession
    const saved = update(current => ({
      ...current,
      pendingSession: null,
      sessions: [{
        id: pending.id,
        taskId: pending.taskId,
        taskTitle: pending.taskTitle,
        startedAt: pending.startedAt,
        endedAt: pending.endedAt,
        durationMs: focusedDuration(pending, Date.parse(pending.endedAt)),
        interest, continueDesire, progress, factors: selectedFactors,
      }, ...current.sessions],
    }))
    if (!saved) return
    if (showJournal) {
      setJournalPrompt(true)
      setView('journal')
    } else {
      navigate(defaultView)
    }
  }

  const disableFocusCheckins = () => {
    const pending = dataRef.current.pendingSession
    if (!pending) return
    if (update(current => recordUnratedSession({ ...current, focusCheckinEnabled: false }, pending))) {
      navigate('main')
    }
  }

  const createJournalEntry = (draft: JournalDraft, folderId?: string) => {
    const saved = update(current => ({
      ...current,
      journal: [{
        ...draft, id: crypto.randomUUID(), createdAt: new Date().toISOString(), taskId: journalTaskId,
        folderId: current.journalFolders?.some(folder => folder.id === folderId) ? folderId : undefined,
      }, ...current.journal],
    }))
    if (saved) {
      setJournalDraft({ text: '' })
      setJournalTaskId(undefined)
      setJournalPrompt(false)
    }
    return saved
  }

  const editJournalEntry = (id: string, draft: JournalDraft) => update(current => ({
    ...current,
    journal: current.journal.map(entry => entry.id === id ? { ...entry, text: draft.text, photo: draft.photo, updatedAt: new Date().toISOString() } : entry),
  }))

  const saveJournalFolder = (name: string, appearance: JournalFolderAppearance, id?: string) => {
    const folders = dataRef.current.journalFolders ?? []
    if (folders.some(folder => folder.id !== id && folder.name.toLowerCase() === name.toLowerCase())) return false
    const journalFolders = id
      ? folders.map(folder => folder.id === id ? { ...folder, name, ...appearance } : folder)
      : [...folders, { id: crypto.randomUUID(), name, ...appearance }]
    return update(current => ({ ...current, journalFolders }))
  }

  const reorderJournalFolders = (from: string, to: string) => {
    const folders = [...(dataRef.current.journalFolders ?? [])]
    const fromIndex = folders.findIndex(folder => folder.id === from)
    const toIndex = folders.findIndex(folder => folder.id === to)
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return false

    const [moved] = folders.splice(fromIndex, 1)
    folders.splice(toIndex, 0, moved)
    return update(current => ({ ...current, journalFolders: folders }))
  }

  const deleteJournalFolder = (id: string) => update(current => ({
    ...current,
    journalFolders: current.journalFolders?.filter(folder => folder.id !== id),
    journal: current.journal.map(entry => entry.folderId === id ? { ...entry, folderId: undefined } : entry),
  }))

  const moveJournalEntry = (id: string, folderId?: string) => {
    const current = dataRef.current
    if (folderId !== undefined && !current.journalFolders?.some(folder => folder.id === folderId)) return false
    return update(data => ({
      ...data,
      journal: data.journal.map(entry => entry.id === id ? { ...entry, folderId } : entry),
    }))
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `lifeos-export-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const navigate = (next: View) => {
    setJournalSearchResult(undefined)
    setView(next !== 'settings' && hiddenSections.includes(next) ? defaultView : next)
    setJournalPrompt(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const returnLabel = showHome ? 'Back to Home' : 'Back to Settings'
  const returnFromSection = () => navigate(showHome ? 'main' : 'settings')

  const openSearchEntry = (id: string) => {
    if (!showJournal) return
    setView('journal')
    setJournalPrompt(false)
    setJournalSearchResult({ id })
  }

  const changeSectionVisibility = (section: NavigationSection, visible: boolean) => update(current => {
    const hidden = (current.hiddenSections ?? []).filter(id => id !== section)
    return { ...current, hiddenSections: visible ? hidden : [...hidden, section] }
  })

  const renderNavigation = (iconSize: number) => <>
    {visibleSections.map(({ id, label }) => {
      const Icon = sectionIcons[id]
      return <NavButton key={id} icon={<Icon size={iconSize} />} label={label} selected={view === id} onClick={() => navigate(id)} />
    })}
    <NavButton icon={<Settings2 size={iconSize} />} label="Settings" selected={view === 'settings'} onClick={() => navigate('settings')} />
  </>

  const renderBrand = (size: number) => {
    const logo = <><span className="brand-mark"><Leaf size={size} strokeWidth={2.4} /></span><span>LifeOS<span className="brand-dot">.</span></span></>
    return showHome
      ? <button className="brand" onClick={() => navigate('main')} aria-label="LifeOS home">{logo}</button>
      : <div className="brand">{logo}</div>
  }

  const openTaskHistory = (taskId: string) => setTaskHistoryId(taskId)
  const historyTask = data.tasks.find(task => task.id === taskHistoryId)
  const linkedTaskTitle = journalTaskId === undefined ? undefined
    : data.tasks.find(task => task.id === journalTaskId)?.title ?? 'Deleted task'

  const pausedSession = data.activeSession?.pausedAt ? data.activeSession : null
  const reminderMinutes = data.breakReminderMinutes ?? 0
  const reminderDueAt = pausedSession?.pausedAt && reminderMinutes > 0 && !pausedSession.breakReminderDismissed && !pausedSession.silenceBreakReminders
    ? Date.parse(pausedSession.pausedAt) + reminderMinutes * 60_000
    : null

  if (data.activeSession && !data.activeSession.pausedAt) return <>
    <MainFocus
      session={data.activeSession}
      showTime={showTime}
      now={now}
      storageError={storageError}
      checkinEnabled={data.focusCheckinEnabled !== false}
      onToggleCheckin={() => update(current => ({ ...current, focusCheckinEnabled: current.focusCheckinEnabled === false }))}
      onToggleTime={() => setShowTime(current => !current)}
      onToggleSilence={toggleFocusSilence}
      onPause={pauseSession}
      onFinish={endSession}
    />
    {undoNotice}
  </>

  if (data.pendingSession) return (<>
    <main className="checkin-screen page-container">
      {storageError && <div className="storage-error" role="alert">Your browser could not save the check-in. Your answers are still here. Check available storage and try again.</div>}
      <div className="focus-top"><div className="brand-mark"><Leaf size={18} strokeWidth={2.3} /></div><span>LifeOS / Check-in</span></div>
      <div className="checkin-card">
        <div className="section-icon"><Sparkles size={20} /></div>
        <p className="eyebrow">A MOMENT TO REFLECT</p>
        <h1>How did it feel?</h1>
        <p className="muted">{data.pendingSession.taskId === null
          ? 'Your focus session is complete.'
          : `Your time with “${data.pendingSession.taskTitle}” is complete.`} A few quick answers help you notice what works.</p>
        <button type="button" className="checkin-turn-off" onClick={disableFocusCheckins}>
          Skip and turn off check-ins
        </button>
        <form onSubmit={saveCheckin}>
          <Rating label="Interest in the process" value={interest} onChange={setInterest} />
          <Rating label="Desire to continue" value={continueDesire} onChange={setContinueDesire} />
          <Rating label="Sense of progress" value={progress} onChange={setProgress} />
          <div className="factor-field"><span className="field-label">What helped? <span className="optional">Optional</span></span><div className="factor-options">{factors.map(factor => <button type="button" key={factor} className={`factor-chip ${selectedFactors.includes(factor) ? 'selected' : ''}`} onClick={() => setSelectedFactors(current => current.includes(factor) ? current.filter(item => item !== factor) : [...current, factor])}>{factor}</button>)}</div></div>
          <button className="button button-dark checkin-submit" disabled={!interest || !continueDesire || !progress}>Save check-in <ArrowRight size={18} /></button>
        </form>
      </div>
    </main>
    {undoNotice}
  </>)

  return (
    <div className={view === 'flow' ? 'app-shell flow-shell' : 'app-shell'}>
      <aside className="sidebar">
        {renderBrand(20)}
        <nav aria-label="Main navigation">{renderNavigation(19)}</nav>
        <div className="sidebar-foot"><div className="sidebar-quote"><span>✳</span><p>A little space for what matters.</p></div><span>LifeOS v0.1</span></div>
      </aside>

      <div className="main-area">
        <header className="mobile-header">{renderBrand(18)}<span>v0.1</span></header>
        {(storageError || loadResult.error) && <div className="storage-error" role="alert">{loadResult.error ?? 'Your browser could not save changes locally. Your unsaved text is still here. Check available storage, then try again.'} {loadResult.error && 'Import a valid backup below to recover. Existing saved content will not be changed until recovery succeeds.'}</div>}
        {backupMessage && <div className="storage-error" role="status">{backupMessage}</div>}
        {reminderDueAt !== null && <BreakReminder dueAt={reminderDueAt}
          onResume={resumeSession} onDismiss={dismissBreakReminder} />}
        {view === 'main' && <MainDashboard
          tasks={data.tasks}
          pausedTaskTitle={pausedSession?.taskTitle}
          displayName={data.displayName}
          onResume={resumeSession}
          onFinishPaused={endSession}
          onUpdate={update}
          onOpenTask={openTaskHistory}
          onDeleteTask={deleteTask}
          onStart={startFocus}
          onStartOpenFocus={() => startFocus()}
          onJournal={showJournal ? () => navigate('journal') : undefined}
          onReflect={hiddenSections.includes('flow') ? undefined : () => navigate('flow')}
          onSettings={() => navigate('settings')}
          onSearch={() => setSearchOpen(true)}
        />}

        {view === 'flow' && <FlowEnginePage data={data} onUpdate={update} onReturn={returnFromSection} returnLabel={returnLabel} />}

        {view === 'journal' && (
          <JournalPage entries={data.journal} folders={data.journalFolders ?? []} draft={journalDraft} onDraftChange={setJournalDraft}
            onReturn={returnFromSection} returnLabel={returnLabel}
            onSaveFolder={saveJournalFolder} onReorderFolders={reorderJournalFolders} onDeleteFolder={deleteJournalFolder} onMoveEntry={moveJournalEntry}
            linkedTaskTitle={linkedTaskTitle} onUnlinkTask={() => setJournalTaskId(undefined)}
            sessionPrompt={journalPrompt} onDismissPrompt={() => setJournalPrompt(false)}
            searchResult={journalSearchResult} onSelectSearchEntry={openSearchEntry}
            onCreate={createJournalEntry} onEdit={editJournalEntry} onDelete={deleteJournalEntry} />
        )}

        {view === 'settings' && (
          <SettingsPage
            theme={data.theme}
            onThemeChange={theme => update(current => ({ ...current, theme }))}
            hiddenSections={hiddenSections}
            onSectionVisibilityChange={changeSectionVisibility}
            onExport={exportData}
            onImport={importBackup}
            repoUrl={repoUrl}
            displayName={data.displayName ?? ''}
            onDisplayNameChange={displayName => update(current => ({ ...current, displayName: displayName || undefined }))}
            reminderMinutes={reminderMinutes}
            onReminderMinutesChange={breakReminderMinutes => update(current => ({ ...current, breakReminderMinutes }))}
            focusCheckin={{
              enabled: data.focusCheckinEnabled !== false,
              onChange: focusCheckinEnabled => update(current => ({ ...current, focusCheckinEnabled })),
            }}
          />
        )}
      </div>
      {historyTask && <TaskHistory
        key={historyTask.id}
        task={historyTask}
        sessions={data.sessions.filter(session => session.taskId === historyTask.id).sort((a, b) => Date.parse(b.endedAt) - Date.parse(a.endedAt))}
        entries={data.journal.filter(entry => entry.taskId === historyTask.id).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))}
        linksExistingDraft={Boolean((journalDraft.text.trim() || journalDraft.photo) && journalTaskId !== historyTask.id)}
        onClose={() => setTaskHistoryId(null)}
        onWriteReflection={showJournal ? () => {
          setTaskHistoryId(null)
          setJournalTaskId(historyTask.id)
          navigate('journal')
        } : undefined}
      />}
      <UnifiedSearch open={searchOpen} tasks={data.tasks} tasksOnly={!showJournal} entries={showJournal ? data.journal : []}
        onClose={() => setSearchOpen(false)} onSelectTask={openTaskHistory} onSelectEntry={openSearchEntry} />
      <nav className="mobile-nav" aria-label="Main navigation">{renderNavigation(21)}</nav>
      {undoNotice}
    </div>
  )
}

function NavButton({ icon, label, selected, onClick }: { icon: React.ReactNode; label: string; selected: boolean; onClick: () => void }) { return <button className={`nav-button ${selected ? 'selected' : ''}`} onClick={onClick} aria-current={selected ? 'page' : undefined}>{icon}<span>{label}</span></button> }
function Rating({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <fieldset className="rating-field"><legend>{label}</legend><div className="rating-buttons">{[1, 2, 3, 4, 5].map(number => <button type="button" className={value === number ? 'selected' : ''} key={number} onClick={() => onChange(number)} aria-label={`${label}: ${number} out of 5`} aria-pressed={value === number}>{number}</button>)}</div><div className="rating-ends"><span>Not much</span><span>Very much</span></div></fieldset> }

export default App
