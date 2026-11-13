import { isJournalPhoto } from './journal/photo.ts'

export type Theme = 'light' | 'dark' | 'system'
export const navigationSections = [
  { id: 'main', label: 'Home' },
  { id: 'flow', label: 'Reflect' },
  { id: 'journal', label: 'Journal' },
] as const
export type NavigationSection = typeof navigationSections[number]['id']
export const shortcuts = [
  { id: 'tasks', label: 'Tasks' },
  { id: 'journal', label: 'Journal' },
  { id: 'focus', label: 'Focus' },
  { id: 'flow', label: 'Reflect' },
] as const
export type Shortcut = typeof shortcuts[number]['id']
export type ShortcutLocation = 'home' | 'bar'
export type ShortcutPreferences = Partial<Record<Shortcut, Partial<Record<ShortcutLocation, boolean>>>>

export function shortcutVisible(data: LifeOSData, shortcut: Shortcut, location: ShortcutLocation): boolean {
  return data.shortcutPreferences?.[shortcut]?.[location] ?? (
    location === 'home'
      ? !((shortcut === 'journal' || shortcut === 'flow') && data.hiddenSections?.includes(shortcut))
      : shortcut === 'journal' && !data.hiddenSections?.includes('journal')
  )
}
export const breakReminderMinutes = [0, 5, 10, 15, 20] as const
export type BreakReminderMinutes = typeof breakReminderMinutes[number]
export const maxDisplayNameLength = 40
export type Factor = 'Meaningful Goal' | 'Personal Control' | 'Fast Feedback' | 'Other'

export const taskLists = ['today', 'someday'] as const
export type TaskList = typeof taskLists[number]

export interface Task {
  id: string
  title: string
  createdAt: string
  completedAt: string | null
  list?: TaskList
}

export interface FocusSession {
  id: string
  taskId: string | null
  taskTitle: string
  startedAt: string
  endedAt: string
  durationMs: number
  interest: number | null
  continueDesire: number | null
  progress: number | null
  factors: Factor[]
}

export interface ActiveSession {
  id: string
  taskId: string | null
  taskTitle: string
  startedAt: string
  pausedAt?: string
  pausedDurationMs?: number
  breakReminderDismissed?: boolean
  silenceBreakReminders?: boolean
}

export interface PendingSession extends ActiveSession {
  endedAt: string
}

export const maxJournalFolderNameLength = 60

export const journalFolderColors = ['blue', 'green', 'purple', 'amber', 'pink', 'slate'] as const
export const journalFolderIcons = ['folder', 'briefcase', 'book', 'heart', 'star', 'lightbulb', 'leaf', 'camera'] as const

export interface JournalFolderAppearance {
  color?: typeof journalFolderColors[number]
  icon?: typeof journalFolderIcons[number]
}

export interface JournalFolder extends JournalFolderAppearance {
  id: string
  name: string
}

export interface JournalEntry {
  id: string
  text: string
  createdAt: string
  updatedAt?: string
  photo?: string
  taskId?: string
  folderId?: string
}

export type FlowSignal = Exclude<Factor, 'Other'>

export interface FlowDiscovery {
  id: string
  createdAt: string
  enjoyableWork: string
  motivation: string
  desireToReturn: string
  signals?: FlowSignal[]
}

export interface FlowHypothesis {
  id: string
  createdAt: string
  statement: string
  sourceDiscoveryId: string | null
  status: 'active' | 'rejected'
}

export interface FlowExperiment {
  id: string
  createdAt: string
  hypothesisId: string
  condition: string
  sessionIds: string[]
  status: 'active' | 'completed'
}

export interface FlowPrinciple {
  id: string
  createdAt: string
  updatedAt: string
  hypothesisId: string
  experimentId: string
  text: string
  evidenceSessionIds: string[]
  status: 'active' | 'rejected'
}

export interface FlowEngineData {
  discoveries: FlowDiscovery[]
  hypotheses: FlowHypothesis[]
  experiments: FlowExperiment[]
  principles: FlowPrinciple[]
}

// Imported source is read-only. rawBytesBase64 is the canonical byte-exact copy;
// rawSource is its unedited UTF-8 text for display and search.
export interface ImportedNote {
  id: string
  sourceName: string
  sourceType: string
  importedAt: string
  sha256: string
  byteLength: number
  rawSource: string
  rawBytesBase64: string
  noteBlocks?: NoteBlock[]
}

// Presentation metadata only. Byte ranges refer to the immutable rawBytesBase64.
export interface NoteBlock {
  order: number
  title: string
  startByte: number
  endByte: number
}

export interface LifeOSData {
  version: 1
  tasks: Task[]
  sessions: FocusSession[]
  journal: JournalEntry[]
  journalFolders?: JournalFolder[]
  importedNotes: ImportedNote[]
  activeSession: ActiveSession | null
  pendingSession: PendingSession | null
  theme: Theme
  hiddenSections?: NavigationSection[]
  shortcutPreferences?: ShortcutPreferences
  focusCheckinEnabled?: boolean
  displayName?: string
  breakReminderMinutes?: BreakReminderMinutes
  // Optional so previously saved version 1 data remains valid without migration.
  flowEngine?: FlowEngineData
}

export const STORAGE_KEY = 'lifeos.v1'

export type LoadResult = { data: LifeOSData; error: string | null }

export const emptyData = (): LifeOSData => ({
  version: 1,
  tasks: [],
  sessions: [],
  journal: [],
  importedNotes: [],
  activeSession: null,
  pendingSession: null,
  theme: 'system',
})

export const emptyFlowEngineData = (): FlowEngineData => ({ discoveries: [], hypotheses: [], experiments: [], principles: [] })

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isString(value: unknown): value is string { return typeof value === 'string' }
function isTimestamp(value: unknown): value is string { return typeof value === 'string' && Number.isFinite(Date.parse(value)) }

function decodeCanonicalBase64(value: string): Uint8Array | null {
  if (value.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) return null
  try {
    const binary = atob(value)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index)
    let encoded = ''
    for (let index = 0; index < bytes.length; index += 8192) encoded += String.fromCharCode(...bytes.subarray(index, index + 8192))
    return btoa(encoded) === value ? bytes : null
  } catch {
    return null
  }
}

function validNoteBlocks(value: unknown, byteLength: number): boolean {
  if (!Array.isArray(value) || value.length === 0 || byteLength === 0) return false
  let expectedStart = 0
  const orders = new Set<number>()
  for (const block of value) {
    if (!isRecord(block) || !Number.isSafeInteger(block.order) || (block.order as number) < 1 || orders.has(block.order as number) || !isString(block.title) || !block.title.trim() || !Number.isSafeInteger(block.startByte) || !Number.isSafeInteger(block.endByte)) return false
    if (block.startByte !== expectedStart || (block.endByte as number) <= (block.startByte as number) || (block.endByte as number) > byteLength) return false
    orders.add(block.order as number)
    expectedStart = block.endByte as number
  }
  return expectedStart === byteLength
}

function validImportedNote(value: unknown): value is ImportedNote {
  if (!isRecord(value) || !isString(value.id) || !isString(value.sourceName) || !isString(value.sourceType) || !isTimestamp(value.importedAt) || !isString(value.sha256) || !/^[a-f0-9]{64}$/.test(value.sha256) || value.id !== value.sha256 || !Number.isSafeInteger(value.byteLength) || (value.byteLength as number) < 0 || !isString(value.rawSource) || !isString(value.rawBytesBase64)) return false
  const bytes = decodeCanonicalBase64(value.rawBytesBase64)
  if (!bytes || bytes.byteLength !== value.byteLength) return false
  if (new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes) !== value.rawSource) return false
  return value.noteBlocks === undefined || validNoteBlocks(value.noteBlocks, bytes.byteLength)
}

export function validateLifeOSData(value: unknown): value is LifeOSData {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.tasks) || !Array.isArray(value.sessions) || !Array.isArray(value.journal) || !Array.isArray(value.importedNotes)) return false
  const validActiveSession = (item: unknown): item is ActiveSession =>
    isRecord(item) && isString(item.id) && (item.taskId === null || isString(item.taskId)) && isString(item.taskTitle) && isTimestamp(item.startedAt) &&
    (item.pausedAt === undefined || isTimestamp(item.pausedAt)) &&
    (item.breakReminderDismissed === undefined || typeof item.breakReminderDismissed === 'boolean') &&
    (item.silenceBreakReminders === undefined || typeof item.silenceBreakReminders === 'boolean') &&
    (item.pausedDurationMs === undefined || (typeof item.pausedDurationMs === 'number' &&
      Number.isSafeInteger(item.pausedDurationMs) && item.pausedDurationMs >= 0))
  if (value.activeSession !== null && !validActiveSession(value.activeSession)) return false
  if (value.pendingSession !== null && !(validActiveSession(value.pendingSession) &&
    isTimestamp((value.pendingSession as Partial<PendingSession>).endedAt))) return false
  if (value.focusCheckinEnabled !== undefined && typeof value.focusCheckinEnabled !== 'boolean') return false
  if (value.displayName !== undefined && (!isString(value.displayName) || value.displayName.length > maxDisplayNameLength)) return false
  if (value.breakReminderMinutes !== undefined && !breakReminderMinutes.some(minutes => minutes === value.breakReminderMinutes)) return false
  if (value.theme !== 'light' && value.theme !== 'dark' && value.theme !== 'system') return false
  if (value.hiddenSections !== undefined && (!Array.isArray(value.hiddenSections) ||
    !value.hiddenSections.every(id => navigationSections.some(section => section.id === id)))) return false
  if (value.shortcutPreferences !== undefined && (!isRecord(value.shortcutPreferences) ||
    !Object.entries(value.shortcutPreferences).every(([id, options]) =>
      shortcuts.some(shortcut => shortcut.id === id) && isRecord(options) &&
      Object.entries(options).every(([location, enabled]) =>
        (location === 'home' || location === 'bar') && typeof enabled === 'boolean')))) return false
  const validTask = (item: unknown) => isRecord(item) && isString(item.id) && isString(item.title) && isTimestamp(item.createdAt) && (item.completedAt === null || isTimestamp(item.completedAt)) &&
    (item.list === undefined || taskLists.some(list => list === item.list))
  const validSessionRatings = (item: Record<string, unknown>) => {
    const ratings = [item.interest, item.continueDesire, item.progress]
    return ratings.every(value => value === null) ||
      ratings.every(value => typeof value === 'number' && Number.isFinite(value))
  }
  const validSession = (item: unknown) => isRecord(item) && isString(item.id) && (item.taskId === null || isString(item.taskId)) && isString(item.taskTitle) && isTimestamp(item.startedAt) && isTimestamp(item.endedAt) && typeof item.durationMs === 'number' && Number.isFinite(item.durationMs) && validSessionRatings(item) && Array.isArray(item.factors) && item.factors.every(factor => ['Meaningful Goal', 'Personal Control', 'Fast Feedback', 'Other'].includes(factor))
  const folderIds = new Set<string>()
  const folderNames = new Set<string>()
  if (value.journalFolders !== undefined) {
    if (!Array.isArray(value.journalFolders)) return false
    for (const folder of value.journalFolders) {
      if (!isRecord(folder) || !isString(folder.id) || !folder.id || folderIds.has(folder.id) ||
        !isString(folder.name) || !folder.name.trim() || folder.name !== folder.name.trim() ||
        folder.name.length > maxJournalFolderNameLength ||
        (folder.color !== undefined && !journalFolderColors.some(color => color === folder.color)) ||
        (folder.icon !== undefined && !journalFolderIcons.some(icon => icon === folder.icon))) return false
      const name = folder.name.toLowerCase()
      if (folderNames.has(name)) return false
      folderIds.add(folder.id)
      folderNames.add(name)
    }
  }
  const validJournal = (item: unknown) => isRecord(item) && isString(item.id) && isString(item.text) && isTimestamp(item.createdAt) &&
    (item.updatedAt === undefined || isTimestamp(item.updatedAt)) && (item.photo === undefined || isJournalPhoto(item.photo)) &&
    (item.taskId === undefined || isString(item.taskId)) &&
    (item.folderId === undefined || (isString(item.folderId) && folderIds.has(item.folderId)))
  const flowEngine = value.flowEngine
  let validFlowEngine = flowEngine === undefined
  if (isRecord(flowEngine)) {
    const sessions = new Set((value.sessions as unknown[]).filter(isRecord).map(session => session.id).filter(isString))
    const discoveries = flowEngine.discoveries
    const hypotheses = flowEngine.hypotheses
    const experiments = flowEngine.experiments
    const principles = flowEngine.principles
    if (Array.isArray(discoveries) && Array.isArray(hypotheses) && Array.isArray(experiments) && Array.isArray(principles)) {
      const validSignals = (signals: unknown) => signals === undefined || (
        Array.isArray(signals) && new Set(signals).size === signals.length &&
        signals.every(signal => signal === 'Meaningful Goal' || signal === 'Fast Feedback' || signal === 'Personal Control')
      )
      const validDiscovery = (item: unknown) => isRecord(item) && isString(item.id) && isTimestamp(item.createdAt) && isString(item.enjoyableWork) && isString(item.motivation) && isString(item.desireToReturn) && validSignals(item.signals)
      const validHypothesis = (item: unknown) => isRecord(item) && isString(item.id) && isTimestamp(item.createdAt) && isString(item.statement) && item.statement.trim().length > 0 && (item.sourceDiscoveryId === null || discoveries.some(discovery => isRecord(discovery) && discovery.id === item.sourceDiscoveryId)) && (item.status === 'active' || item.status === 'rejected')
      const validExperiment = (item: unknown) => isRecord(item) && isString(item.id) && isTimestamp(item.createdAt) && hypotheses.some(hypothesis => isRecord(hypothesis) && hypothesis.id === item.hypothesisId) && isString(item.condition) && item.condition.trim().length > 0 && Array.isArray(item.sessionIds) && item.sessionIds.every(id => isString(id) && sessions.has(id)) && new Set(item.sessionIds).size === item.sessionIds.length && (item.status === 'active' || item.status === 'completed')
      const validPrinciple = (item: unknown) => isRecord(item) && isString(item.id) && isTimestamp(item.createdAt) && isTimestamp(item.updatedAt) && hypotheses.some(hypothesis => isRecord(hypothesis) && hypothesis.id === item.hypothesisId) && experiments.some(experiment => isRecord(experiment) && experiment.id === item.experimentId && experiment.hypothesisId === item.hypothesisId) && isString(item.text) && item.text.trim().length > 0 && Array.isArray(item.evidenceSessionIds) && item.evidenceSessionIds.every(id => isString(id) && sessions.has(id)) && (item.status === 'active' || item.status === 'rejected')
      validFlowEngine = discoveries.every(validDiscovery) && hypotheses.every(validHypothesis) && experiments.every(validExperiment) && principles.every(validPrinciple)
    }
  }
  return value.tasks.every(validTask) && value.sessions.every(validSession) && value.journal.every(validJournal) && value.importedNotes.every(validImportedNote) && validFlowEngine
}

export function parseBackup(raw: string): LifeOSData {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { throw new Error('This file is not valid JSON.') }
  if (isRecord(parsed) && Array.isArray(parsed.tasks)) {
    // Older saved data and backups used Upcoming for deferred tasks.
    parsed.tasks = parsed.tasks.map(task => isRecord(task) && task.list === 'upcoming'
      ? { ...task, list: 'someday' }
      : task)
  }
  if (!validateLifeOSData(parsed)) throw new Error('This file does not have a valid LifeOS backup structure.')
  return parsed
}

export async function parseBackupWithIntegrity(raw: string): Promise<LifeOSData> {
  const data = parseBackup(raw)
  for (const note of data.importedNotes) {
    const bytes = decodeCanonicalBase64(note.rawBytesBase64)
    if (!bytes) throw new Error('This backup contains an invalid imported Note encoding.')
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    const sha256 = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
    if (sha256 !== note.sha256) throw new Error('This backup contains an imported Note with an invalid SHA-256 hash.')
  }
  return data
}

export async function prepareBackupRestore(raw: string, current: LifeOSData): Promise<LifeOSData> {
  const next = mergeBackupData(current, parseBackup(raw))
  await parseBackupWithIntegrity(JSON.stringify(next))
  return next
}

export async function restoreBackup(
  raw: string,
  current: LifeOSData,
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  confirmReplacement: () => boolean,
  storageKey = STORAGE_KEY,
): Promise<LifeOSData | null> {
  const next = await prepareBackupRestore(raw, current)
  if (!confirmReplacement()) return null

  let previousRaw: string | null
  try { previousRaw = storage.getItem(storageKey) }
  catch { throw new Error('Could not access the existing saved data. It has not been changed.') }
  if (previousRaw !== null) {
    try { await parseBackupWithIntegrity(previousRaw) }
    catch {
      try {
        const archiveBase = storageKey === STORAGE_KEY ? `lifeos.recovery.${Date.now()}` : `${storageKey}.recovery.${Date.now()}`
        let archiveKey = archiveBase
        let suffix = 1
        while (storage.getItem(archiveKey) !== null) archiveKey = `${archiveBase}.${suffix++}`
        storage.setItem(archiveKey, previousRaw)
      } catch {
        throw new Error('Could not preserve the existing saved data. Free browser storage and try again.')
      }
    }
  }

  try { storage.setItem(storageKey, JSON.stringify(next)) }
  catch { throw new Error('Could not save the backup. Your existing saved data is still available.') }
  return next
}

export function mergeBackupData(current: LifeOSData, backup: LifeOSData): LifeOSData {
  const importedNotes = [...current.importedNotes]
  const knownHashes = new Set(importedNotes.map(note => note.sha256))
  for (const note of backup.importedNotes) if (!knownHashes.has(note.sha256)) importedNotes.push(note)
  return resolvePendingSession({ ...backup, importedNotes })
}

export function loadData(storageKey = STORAGE_KEY): LoadResult {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return { data: emptyData(), error: null }
    try {
      return { data: resolvePendingSession(parseBackup(raw)), error: null }
    } catch (error) {
      return { data: emptyData(), error: error instanceof Error ? error.message : 'Saved LifeOS data could not be read.' }
    }
  } catch {
    return { data: emptyData(), error: 'Browser storage is unavailable. Import a backup before continuing.' }
  }
}

export function saveData(data: LifeOSData, storageKey = STORAGE_KEY): boolean {
  try {
    localStorage.setItem(storageKey, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export function sessionMinutes(durationMs: number): string {
  if (durationMs < 60000) return 'Less than a minute'
  const minutes = Math.round(durationMs / 60000)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  return `${hours} hr${hours > 1 ? 's' : ''}${minutes % 60 ? ` ${minutes % 60} min` : ''}`
}

export function recordUnratedSession(data: LifeOSData, finished: PendingSession): LifeOSData {
  const { id, taskId, taskTitle, startedAt, endedAt } = finished
  const session: FocusSession = {
    id, taskId, taskTitle, startedAt, endedAt,
    durationMs: focusedDuration(finished, Date.parse(endedAt)),
    interest: null,
    continueDesire: null,
    progress: null,
    factors: [],
  }
  const sessions = data.sessions.some(item => item.id === id) ? data.sessions : [session, ...data.sessions]
  return { ...data, pendingSession: null, sessions }
}

function resolvePendingSession(data: LifeOSData): LifeOSData {
  return data.focusCheckinEnabled === false && data.pendingSession
    ? recordUnratedSession(data, data.pendingSession)
    : data
}

export function focusedDuration(session: ActiveSession, now: number): number {
  const end = session.pausedAt ? Math.min(Date.parse(session.pausedAt), now) : now
  return Math.max(0, end - Date.parse(session.startedAt) - (session.pausedDurationMs ?? 0))
}

export function elapsedClock(durationMs: number): string {
  const seconds = Math.floor(Math.max(0, durationMs) / 1000)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}` : `${minutes}:${String(rest).padStart(2, '0')}`
}
