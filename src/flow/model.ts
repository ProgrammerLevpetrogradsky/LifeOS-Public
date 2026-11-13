import { emptyFlowEngineData, type Factor, type FocusSession, type FlowEngineData, type FlowExperiment, type FlowHypothesis, type FlowPrinciple, type LifeOSData } from '../data.ts'

export interface FactorObservation {
  factor: Factor
  sessionCount: number
  averageInterest: number
  averageProgress: number
}

export interface SessionSummary {
  count: number
  interest: string
  continueDesire: string
  progress: string
}

export function updateFlowEngine(
  current: LifeOSData,
  change: (flow: FlowEngineData) => FlowEngineData,
): LifeOSData {
  return { ...current, flowEngine: change(current.flowEngine ?? emptyFlowEngineData()) }
}

export function factorObservations(sessions: FocusSession[]): FactorObservation[] {
  const factors: Factor[] = ['Meaningful Goal', 'Personal Control', 'Fast Feedback', 'Other']
  return factors.map(factor => {
    const matching = sessions.filter(session => session.interest !== null && session.progress !== null && session.factors.includes(factor))
    return {
      factor,
      sessionCount: matching.length,
      averageInterest: matching.length ? matching.reduce((sum, session) => sum + (session.interest ?? 0), 0) / matching.length : 0,
      averageProgress: matching.length ? matching.reduce((sum, session) => sum + (session.progress ?? 0), 0) / matching.length : 0,
    }
  }).filter(item => item.sessionCount > 0).sort((a, b) => b.averageInterest - a.averageInterest || b.sessionCount - a.sessionCount)
}

export function summarizeSessions(sessions: FocusSession[]): SessionSummary {
  const count = sessions.length
  const average = (key: 'interest' | 'continueDesire' | 'progress') => {
    const ratings = sessions.map(session => session[key]).filter(value => value !== null)
    return ratings.length ? (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1) : '—'
  }
  return { count, interest: average('interest'), continueDesire: average('continueDesire'), progress: average('progress') }
}

export function recentSessions(sessions: FocusSession[], limit = 8): FocusSession[] {
  return [...sessions].sort((a, b) => b.endedAt.localeCompare(a.endedAt)).slice(0, limit)
}

export function hypothesisSuggestion(factor: Factor): string {
  return `Including ${factor.toLowerCase()} may help me feel interested and make progress.`
}

export function principleDraft(hypothesis: FlowHypothesis, experiment: FlowExperiment): string {
  return `${hypothesis.statement} I may make better progress when I ${experiment.condition.trim()}.`
}

export function canDistillPrinciple(experiment: FlowExperiment): boolean {
  return experiment.sessionIds.length >= 2
}

export function principleHasEvidence(principle: FlowPrinciple, experiment: FlowExperiment): boolean {
  return principle.experimentId === experiment.id && principle.evidenceSessionIds.length >= 2
}
