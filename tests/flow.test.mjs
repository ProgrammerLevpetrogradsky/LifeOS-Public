import test from 'node:test'
import assert from 'node:assert/strict'
import { emptyData, validateLifeOSData } from '../src/data.ts'
import { canDistillPrinciple, factorObservations, hypothesisSuggestion, principleDraft, recentSessions, summarizeSessions, updateFlowEngine } from '../src/flow/model.ts'

const session = (id, interest, progress, factors = ['Personal Control']) => ({
  id, taskId: `task-${id}`, taskTitle: `Task ${id}`, startedAt: '2026-10-21T10:00:00.000Z', endedAt: '2026-10-21T10:20:00.000Z',
  durationMs: 1200000, interest, continueDesire: interest, progress, factors,
})

test('old version 1 data without Flow Engine remains valid without migration', () => {
  const legacy = emptyData()
  assert.equal(Object.hasOwn(legacy, 'flowEngine'), false)
  assert.equal(validateLifeOSData(legacy), true)
})

test('adding Flow Engine data preserves existing version 1 focus sessions unchanged', () => {
  const legacy = emptyData()
  legacy.sessions = [session('existing-session', 4, 3)]
  const updated = updateFlowEngine(legacy, flow => ({
    ...flow,
    discoveries: [{ id: 'd1', createdAt: '2026-10-21T10:00:00.000Z', enjoyableWork: 'Solving', motivation: '', desireToReturn: '' }],
  }))
  assert.deepEqual(updated.sessions, legacy.sessions)
  assert.deepEqual(updated.flowEngine?.discoveries[0].enjoyableWork, 'Solving')
  assert.equal(validateLifeOSData(updated), true)
})

test('Flow Engine state validates links to existing discoveries, hypotheses, experiments and sessions', () => {
  const data = emptyData()
  data.sessions = [session('s1', 4, 3), session('s2', 5, 4)]
  data.flowEngine = {
    discoveries: [{ id: 'd1', createdAt: '2026-10-21T10:00:00.000Z', enjoyableWork: 'Solving', motivation: '', desireToReturn: 'A clear next step' }],
    hypotheses: [{ id: 'h1', createdAt: '2026-10-21T10:00:00.000Z', statement: 'Choice may help me engage.', sourceDiscoveryId: 'd1', status: 'active' }],
    experiments: [{ id: 'e1', createdAt: '2026-10-21T10:00:00.000Z', hypothesisId: 'h1', condition: 'choose the first step', sessionIds: ['s1', 's2'], status: 'completed' }],
    principles: [{ id: 'p1', createdAt: '2026-10-21T10:00:00.000Z', updatedAt: '2026-10-21T10:00:00.000Z', hypothesisId: 'h1', experimentId: 'e1', text: 'Choice may help me begin.', evidenceSessionIds: ['s1', 's2'], status: 'active' }],
  }
  assert.equal(validateLifeOSData(data), true)
  data.flowEngine.experiments[0].sessionIds = ['missing-session']
  assert.equal(validateLifeOSData(data), false)
})

test('Flow observations summarize existing check-ins without claiming causation', () => {
  const observations = factorObservations([
    session('s1', 4, 3, ['Personal Control']),
    session('s2', 2, 5, ['Fast Feedback']),
    session('s3', 5, 4, ['Personal Control', 'Fast Feedback']),
  ])
  assert.deepEqual(observations[0], { factor: 'Personal Control', sessionCount: 2, averageInterest: 4.5, averageProgress: 3.5 })
  assert.deepEqual(observations[1], { factor: 'Fast Feedback', sessionCount: 2, averageInterest: 3.5, averageProgress: 4.5 })
})

test('Flow history summary and recent list include sessions with no selected factors', () => {
  const allSessions = [
    { ...session('without-factors', 4, 3, []), endedAt: '2026-10-20T10:20:00.000Z' },
    { ...session('older', 2, 5, ['Fast Feedback']), endedAt: '2026-10-21T10:20:00.000Z' },
    { ...session('newer', 5, 4, []), endedAt: '2026-10-22T10:20:00.000Z' },
  ]
  assert.deepEqual(summarizeSessions(allSessions), { count: 3, interest: '3.7', continueDesire: '3.7', progress: '4.0' })
  assert.deepEqual(recentSessions(allSessions).map(item => item.id), ['newer', 'older', 'without-factors'])
})

test('hypothesis and principle drafts stay tentative and require repeated session evidence', () => {
  const hypothesis = { id: 'h1', createdAt: '2026-10-21T10:00:00.000Z', statement: 'Choice may help me engage.', sourceDiscoveryId: null, status: 'active' }
  const experiment = { id: 'e1', createdAt: '2026-10-21T10:00:00.000Z', hypothesisId: 'h1', condition: 'choose one small next step', sessionIds: ['s1'], status: 'active' }
  assert.match(hypothesisSuggestion('Meaningful Goal'), /may help/i)
  assert.equal(canDistillPrinciple(experiment), false)
  experiment.sessionIds.push('s2')
  assert.equal(canDistillPrinciple(experiment), true)
  assert.match(principleDraft(hypothesis, experiment), /may/i)
})
