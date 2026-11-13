import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { emptyData, elapsedClock, loadData, mergeBackupData, parseBackup, parseBackupWithIntegrity, restoreBackup, saveData, sessionMinutes, STORAGE_KEY } from '../src/data.ts'
import { base64ToBytes, buildNoteBlocks, makeImportedNote, noteBody } from '../src/notes.ts'

async function backupWithNote(text = 'text') {
  const backup = emptyData()
  backup.tasks.push({ id: 'restore-task', title: 'Recovered', createdAt: '2026-10-21T10:00:00.000Z', completedAt: null })
  backup.importedNotes.push(await makeImportedNote('synthetic.md', 'text/markdown', new TextEncoder().encode(text)))
  return backup
}

test('tasks, sessions, journal, and active focus survive a save and reload', () => {
  const memory = new Map()
  globalThis.localStorage = {
    getItem: key => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, value),
  }
  const data = emptyData()
  data.tasks.push({ id: 'task', title: 'Write one page', createdAt: '2026-10-21T10:00:00.000Z', completedAt: null })
  data.activeSession = { id: 'active', taskId: 'task', taskTitle: 'Write one page', startedAt: '2026-10-21T10:01:00.000Z' }
  data.sessions.push({ id: 'done', taskId: 'task', taskTitle: 'Write one page', startedAt: '2026-10-20T10:00:00.000Z', endedAt: '2026-10-20T10:20:00.000Z', durationMs: 1200000, interest: 4, continueDesire: 5, progress: 3, factors: ['Personal Control'] })
  data.journal.push({ id: 'entry', text: 'The quiet helped.', createdAt: '2026-10-21T10:25:00.000Z' })
  assert.equal(saveData(data), true)
  assert.deepEqual(loadData().data, data)
})

test('older Upcoming tasks move to Someday when loaded or restored from a backup', async () => {
  const createdAt = '2026-10-21T10:00:00.000Z'
  const completedAt = '2026-10-21T11:00:00.000Z'
  const backup = {
    ...emptyData(),
    tasks: [
      { id: 'today', title: 'Today', createdAt, completedAt: null },
      { id: 'deferred', title: 'Deferred task', createdAt, completedAt: null, list: 'upcoming' },
      { id: 'completed', title: 'Finished task', createdAt, completedAt, list: 'upcoming' },
    ],
    journal: [{ id: 'entry', taskId: 'completed', text: 'A linked note', createdAt }],
  }
  const expected = {
    ...backup,
    tasks: [backup.tasks[0], { ...backup.tasks[1], list: 'someday' }, { ...backup.tasks[2], list: 'someday' }],
  }
  const raw = JSON.stringify(backup)
  const storage = new Map([[STORAGE_KEY, raw]])
  globalThis.localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  }

  assert.deepEqual(loadData(), { data: expected, error: null })
  assert.equal(storage.get(STORAGE_KEY), raw)
  assert.deepEqual(await restoreBackup(raw, emptyData(), localStorage, () => true), expected)
  assert.deepEqual(JSON.parse(storage.get(STORAGE_KEY)), expected)
  assert.equal(storage.size, 1)
})

test('failed storage writes report failure and leave the previous value untouched', () => {
  const previous = JSON.stringify(emptyData())
  globalThis.localStorage = {
    getItem: key => key === STORAGE_KEY ? previous : null,
    setItem: () => { throw new Error('QuotaExceededError') },
  }
  const next = emptyData()
  next.journal.push({ id: 'draft', text: 'Keep this draft in the form after a failed save.', createdAt: new Date().toISOString() })
  assert.equal(saveData(next), false)
  assert.equal(localStorage.getItem(STORAGE_KEY), previous)
})

test('corrupt saved JSON reports a recovery error and is not overwritten', () => {
  const corrupt = '{"version":1,"tasks":['
  globalThis.localStorage = {
    getItem: key => key === STORAGE_KEY ? corrupt : null,
    setItem: () => assert.fail('loadData must not write to storage'),
  }
  const result = loadData()
  assert.match(result.error, /JSON|structure/i)
  assert.deepEqual(localStorage.getItem(STORAGE_KEY), corrupt)
})

test('valid backup structure and imported Note integrity restore successfully', async () => {
  const backup = await backupWithNote()
  backup.importedNotes[0].noteBlocks = [
    { order: 1, title: 'First half', startByte: 0, endByte: 2 },
    { order: 2, title: 'Second half', startByte: 2, endByte: 4 },
  ]
  assert.deepEqual(parseBackup(JSON.stringify(backup)), backup)
  assert.deepEqual(await parseBackupWithIntegrity(JSON.stringify(backup)), backup)
  const memory = new Map()
  globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) }
  assert.equal(saveData(parseBackup(JSON.stringify(backup))), true)
  assert.deepEqual(loadData().data, backup)

  const savedBeforeConfirm = JSON.stringify(emptyData())
  const storage = new Map([[STORAGE_KEY, savedBeforeConfirm]])
  const restored = await restoreBackup(JSON.stringify(backup), emptyData(), {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  }, () => {
    assert.equal(storage.get(STORAGE_KEY), savedBeforeConfirm)
    return true
  })
  assert.deepEqual(restored, backup)
  assert.deepEqual(JSON.parse(storage.get(STORAGE_KEY)), backup)
})

test('restoring a backup preserves existing private notes and restores other data', () => {
  const current = emptyData()
  current.importedNotes.push({ id: 'private', sourceName: 'private.md', sourceType: 'text/markdown', importedAt: '2026-10-21T10:00:00.000Z', sha256: 'private-hash', byteLength: 4, rawSource: 'keep', rawBytesBase64: 'a2VlcA==' })
  const backup = emptyData()
  backup.tasks.push({ id: 'restored-task', title: 'Restored', createdAt: '2026-10-21T10:00:00.000Z', completedAt: null })
  backup.importedNotes.push({ id: 'other', sourceName: 'other.md', sourceType: 'text/markdown', importedAt: '2026-10-21T10:00:00.000Z', sha256: 'other-hash', byteLength: 4, rawSource: 'text', rawBytesBase64: 'dGV4dA==' })
  const restored = mergeBackupData(current, backup)
  assert.deepEqual(restored.tasks, backup.tasks)
  assert.deepEqual(restored.importedNotes.map(note => note.sha256), ['private-hash', 'other-hash'])
})

test('backup import rejects malformed and incomplete data', () => {
  assert.throws(() => parseBackup('{broken'), /valid JSON/)
  assert.throws(() => parseBackup('{"version":1}'), /valid LifeOS backup structure/)
})

test('backup import rejects malformed base64, byte lengths, and decoded text', async () => {
  const malformedEncoding = await backupWithNote()
  malformedEncoding.importedNotes[0].rawBytesBase64 = 'dGV4dA'
  assert.throws(() => parseBackup(JSON.stringify(malformedEncoding)), /valid LifeOS backup structure/)

  const wrongLength = await backupWithNote()
  wrongLength.importedNotes[0].byteLength++
  assert.throws(() => parseBackup(JSON.stringify(wrongLength)), /valid LifeOS backup structure/)

  const wrongText = await backupWithNote()
  wrongText.importedNotes[0].rawSource = 'different text'
  assert.throws(() => parseBackup(JSON.stringify(wrongText)), /valid LifeOS backup structure/)
})

test('backup import rejects invalid Note block ranges and gaps', async () => {
  const outOfBounds = await backupWithNote()
  outOfBounds.importedNotes[0].noteBlocks = [{ order: 1, title: 'Only block', startByte: 0, endByte: 5 }]
  assert.throws(() => parseBackup(JSON.stringify(outOfBounds)), /valid LifeOS backup structure/)

  const withGap = await backupWithNote()
  withGap.importedNotes[0].noteBlocks = [
    { order: 1, title: 'First', startByte: 0, endByte: 2 },
    { order: 2, title: 'Second', startByte: 3, endByte: 4 },
  ]
  assert.throws(() => parseBackup(JSON.stringify(withGap)), /valid LifeOS backup structure/)
})

test('backup import verifies SHA-256 against original Note bytes', async () => {
  const backup = await backupWithNote()
  backup.importedNotes[0].sha256 = '0'.repeat(64)
  backup.importedNotes[0].id = backup.importedNotes[0].sha256
  await assert.rejects(parseBackupWithIntegrity(JSON.stringify(backup)), /invalid SHA-256/)
})

test('a rejected backup leaves existing saved data untouched', async () => {
  const original = emptyData()
  original.journal.push({ id: 'existing', text: 'Keep this entry', createdAt: '2026-10-21T10:00:00.000Z' })
  const rawExisting = JSON.stringify(original)
  const memory = new Map([[STORAGE_KEY, rawExisting]])
  let confirmationCount = 0
  const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) }

  const malformed = await backupWithNote()
  malformed.importedNotes[0].sha256 = 'f'.repeat(64)
  malformed.importedNotes[0].id = malformed.importedNotes[0].sha256
  await assert.rejects(restoreBackup(JSON.stringify(malformed), original, storage, () => { confirmationCount++; return true }), /invalid SHA-256/)
  assert.equal(confirmationCount, 0)
  assert.equal(storage.getItem(STORAGE_KEY), rawExisting)
  assert.equal(memory.size, 1)
})

test('a current Note with mismatched SHA-256 leaves LifeOS and recovery keys untouched', async () => {
  const current = await backupWithNote('keep this original note')
  current.importedNotes[0].sha256 = 'a'.repeat(64)
  current.importedNotes[0].id = current.importedNotes[0].sha256
  const backup = await backupWithNote('replacement note')
  const originalEntries = [
    [STORAGE_KEY, JSON.stringify(current)],
    ['lifeos.recovery.123', '{"original":"recovery value"}'],
  ]
  const memory = new Map(originalEntries)
  const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) }
  let confirmationCount = 0

  await assert.rejects(restoreBackup(JSON.stringify(backup), current, storage, () => { confirmationCount++; return true }), /invalid SHA-256/)
  assert.equal(confirmationCount, 0)
  assert.deepEqual(Array.from(memory.entries()), originalEntries)
})

test('elapsed and session labels handle short and long sessions', () => {
  assert.equal(elapsedClock(65900), '1:05')
  assert.equal(elapsedClock(3661000), '1:01:01')
  assert.equal(sessionMinutes(30000), 'Less than a minute')
  assert.equal(sessionMinutes(3900000), '1 hr 5 min')
})

test('imported source preserves UTF-8 bytes, BOM, line endings, and repetition', async () => {
  const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode('hey!!\r\nשלום / привет\nhey!!\r\n')])
  const note = await makeImportedNote('original.md', 'text/markdown', bytes)
  assert.deepEqual(base64ToBytes(note.rawBytesBase64), bytes)
  assert.equal(note.rawSource, '\uFEFFhey!!\r\nשלום / привет\nhey!!\r\n')
  assert.equal(note.byteLength, bytes.length)
})

test('private note index covers both complete sources in 20 unchanged blocks', async t => {
  const path = '.lifeos-private/note-index.json'
  if (!existsSync(path)) return t.skip('Private source files are not part of the public repository')
  const indexes = JSON.parse(readFileSync(path, 'utf8')).sources
  const orders = []
  for (const index of indexes) {
    const bytes = readFileSync(`.lifeos-private/imports/${index.sourceName}`)
    const note = await makeImportedNote(index.sourceName, 'text/plain', bytes)
    const blocks = buildNoteBlocks(note, index)
    assert.ok(blocks, `Invalid index for ${index.sourceName}`)
    assert.deepEqual(Buffer.from(note.rawBytesBase64, 'base64'), bytes)
    assert.equal(note.rawSource, new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes))
    assert.deepEqual(Buffer.concat(blocks.map(block => bytes.subarray(block.startByte, block.endByte))), bytes)
    for (const block of blocks) {
      assert.equal(noteBody(note, block), new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes.subarray(block.startByte, block.endByte)))
      orders.push(block.order)
    }
  }
  assert.deepEqual(orders.sort((a, b) => a - b), Array.from({ length: 20 }, (_, index) => index + 1))
})
