import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Check, ChevronRight, History, X } from 'lucide-react'
import { sessionMinutes, type FlowDiscovery, type FlowEngineData, type LifeOSData } from '../data'
import { emptyFlowEngineData } from '../data'
import { canDistillPrinciple, factorObservations, hypothesisSuggestion, principleDraft, principleHasEvidence, recentSessions, summarizeSessions, updateFlowEngine } from './model'
import { DiscoveryConversation, DiscoveryQuestion, DiscoveryResults, discoveryFromAnswers, emptyAnswers, prompts } from './Discovery'
import './flow.css'

export interface FlowEnginePageProps {
  data: LifeOSData
  onUpdate: (change: (current: LifeOSData) => LifeOSData) => boolean
  onReturn: () => void
  returnLabel: string
  sessionsOnly?: boolean
}

type FlowStage = 'home' | 'discover' | 'review' | 'analyze' | 'experiment' | 'principle' | 'history' | 'reflections'

const tools = [
  { stage: 'analyze', label: 'Find patterns' },
  { stage: 'experiment', label: 'Try an idea' },
  { stage: 'principle', label: 'What works for you' },
] as const

const newId = () => crypto.randomUUID()
const dateLabel = (date: string) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(date))
const timeLabel = (date: string) => new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(date))

export default function FlowEnginePage({ data, onUpdate, onReturn, returnLabel, sessionsOnly = false }: FlowEnginePageProps) {
  const [stage, setStage] = useState<FlowStage>(sessionsOnly ? 'history' : 'discover')
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState(emptyAnswers)
  const [draft, setDraft] = useState<FlowDiscovery | null>(null)
  const pageRef = useRef<HTMLElement>(null)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    const heading = pageRef.current?.querySelector<HTMLElement>('h1')
    heading?.focus({ preventScroll: true })
    if (heading && (stage === 'discover' || stage === 'review') &&
      heading.getBoundingClientRect().bottom > window.innerHeight * 0.65) {
      heading.scrollIntoView({ block: 'center', behavior: 'instant' })
    }
  }, [stage, step])

  const [hypothesisText, setHypothesisText] = useState('')
  const [selectedDiscoveryId, setSelectedDiscoveryId] = useState('')
  const [experimentHypothesisId, setExperimentHypothesisId] = useState('')
  const [condition, setCondition] = useState('')
  const [selectedExperimentId, setSelectedExperimentId] = useState('')
  const [editingPrincipleId, setEditingPrincipleId] = useState<string | null>(null)
  const [principleText, setPrincipleText] = useState('')
  const [message, setMessage] = useState('')

  const flow = data.flowEngine ?? emptyFlowEngineData()
  const observations = useMemo(() => factorObservations(data.sessions), [data.sessions])
  const sessionSummary = useMemo(() => summarizeSessions(data.sessions), [data.sessions])
  const recent = useMemo(() => recentSessions(data.sessions, sessionsOnly ? data.sessions.length : undefined), [data.sessions, sessionsOnly])
  const activeHypotheses = flow.hypotheses.filter(item => item.status === 'active')
  const activeExperiments = flow.experiments.filter(item => item.status === 'active')
  const selectedExperiment = flow.experiments.find(item => item.id === selectedExperimentId) ?? activeExperiments[0]

  const save = (change: (current: FlowEngineData) => FlowEngineData, successMessage: string) => {
    const saved = onUpdate(current => updateFlowEngine(current, change))
    setMessage(saved ? successMessage : 'Your change was not saved. Your text is still here; try again when storage is available.')
    return saved
  }

  const openStage = (next: FlowStage) => {
    setMessage('')
    setStage(next)
  }

  const startDiscovery = () => {
    setStep(0)
    setAnswers(emptyAnswers())
    setDraft(null)
    openStage('discover')
  }

  const nextQuestion = () => {
    if (step < prompts.length - 1) {
      setStep(step + 1)
      return
    }
    setDraft(discoveryFromAnswers(answers))
    openStage('review')
  }

  const planFrom = (discovery: FlowDiscovery) => {
    setSelectedDiscoveryId(discovery.id)
    const signal = discovery.signals?.[0]
    setHypothesisText(signal ? hypothesisSuggestion(signal) : '')
    openStage('analyze')
  }

  const saveDiscovery = () => {
    if (!draft) return
    if (!save(current => ({
      ...current,
      discoveries: [draft, ...current.discoveries],
    }), 'Reflection saved.')) return
    setDraft(null)
    setStage('home')
  }

  const goBack = () => {
    if (sessionsOnly) {
      onReturn()
      return
    }
    if (stage === 'home' || (stage === 'discover' && step === 0)) {
      onReturn()
    } else if (stage === 'review') {
      openStage('discover')
    } else if (stage === 'discover' && step > 0) {
      setStep(step - 1)
    } else if (stage === 'reflections' || tools.some(tool => tool.stage === stage)) {
      openStage('history')
    } else {
      openStage('home')
    }
  }

  const saveHypothesis = (event: FormEvent) => {
    event.preventDefault()
    const statement = hypothesisText.trim()
    if (!statement) return
    const hypothesis = { id: newId(), createdAt: new Date().toISOString(), statement, sourceDiscoveryId: selectedDiscoveryId || null, status: 'active' as const }
    if (!save(current => ({ ...current, hypotheses: [hypothesis, ...current.hypotheses] }), 'Hypothesis saved as a question to explore.')) return
    setHypothesisText('')
    setExperimentHypothesisId(hypothesis.id)
  }

  const rejectHypothesis = (id: string) => save(current => ({
    ...current,
    hypotheses: current.hypotheses.map(item => item.id === id ? { ...item, status: 'rejected' } : item),
  }), 'Hypothesis set aside; its history is kept.')

  const startExperiment = (event: FormEvent) => {
    event.preventDefault()
    if (!experimentHypothesisId || !condition.trim()) return
    const experiment = { id: newId(), createdAt: new Date().toISOString(), hypothesisId: experimentHypothesisId, condition: condition.trim(), sessionIds: [], status: 'active' as const }
    if (!save(current => ({ ...current, experiments: [experiment, ...current.experiments] }), 'Experiment started. Link focus sessions as you go.')) return
    setCondition('')
    setSelectedExperimentId(experiment.id)
  }

  const linkSession = (experimentId: string, sessionId: string) => save(current => ({
    ...current,
    experiments: current.experiments.map(item => item.id === experimentId && !item.sessionIds.includes(sessionId)
      ? { ...item, sessionIds: [...item.sessionIds, sessionId] }
      : item),
  }), 'Focus session linked.')

  const finishExperiment = (experimentId: string) => save(current => ({
    ...current,
    experiments: current.experiments.map(item => item.id === experimentId ? { ...item, status: 'completed' } : item),
  }), 'Experiment completed. Review the pattern when ready.')

  const createPrinciple = (experimentId: string) => {
    const experiment = flow.experiments.find(item => item.id === experimentId)
    const hypothesis = experiment && flow.hypotheses.find(item => item.id === experiment.hypothesisId)
    if (!experiment || !hypothesis || !canDistillPrinciple(experiment)) return
    const principle = { id: newId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), hypothesisId: hypothesis.id, experimentId: experiment.id, text: principleDraft(hypothesis, experiment), evidenceSessionIds: [...experiment.sessionIds], status: 'active' as const }
    if (save(current => ({ ...current, principles: [principle, ...current.principles] }), 'Principle saved. You can revise it as you learn.')) {
      setEditingPrincipleId(principle.id)
      setPrincipleText(principle.text)
    }
  }

  const savePrinciple = (id: string) => {
    const text = principleText.trim()
    if (!text) return
    if (save(current => ({
      ...current,
      principles: current.principles.map(item => item.id === id ? { ...item, text, updatedAt: new Date().toISOString() } : item),
    }), 'Principle updated.')) setEditingPrincipleId(null)
  }

  const rejectPrinciple = (id: string) => save(current => ({
    ...current,
    principles: current.principles.map(item => item.id === id ? { ...item, status: 'rejected' } : item),
  }), 'Principle set aside; its evidence history is kept.')

  const sessionById = new Map(data.sessions.map(session => [session.id, session]))
  const sessionLabel = (id: string) => {
    const session = sessionById.get(id)
    return session ? `${session.taskTitle} · ${dateLabel(session.endedAt)}` : 'Past focus session'
  }

  const titles: Partial<Record<FlowStage, string>> = {
    analyze: 'Find patterns',
    experiment: 'Try an idea',
    principle: 'What works for you',
    history: sessionsOnly ? 'Focus history' : 'History',
    reflections: 'Past reflections',
  }
  const title = titles[stage]
  const isReflectStart = stage === 'home' || (stage === 'discover' && step === 0)
  const backLabel = sessionsOnly || isReflectStart ? returnLabel : stage === 'review' || stage === 'discover'
    ? 'Previous question'
    : stage === 'reflections' || tools.some(tool => tool.stage === stage) ? 'Back to History' : 'Back to Reflect'
  const historyButton = <button type="button" className="flow-history-button" onClick={() => openStage('history')}>
    <History size={18} aria-hidden="true" /> History
  </button>

  return <main ref={pageRef} className="page-content flow-engine-page">
    {stage === 'home' ? <header className="flow-home-header">
      <button type="button" className="flow-back" aria-label={backLabel} onClick={goBack}><ArrowLeft size={21} /></button>
      <h1 tabIndex={-1}>Reflect</h1>
      {historyButton}
    </header> : <div className="flow-toolbar">
      <button type="button" className="flow-back" aria-label={backLabel} onClick={goBack}><ArrowLeft size={21} /></button>
      {stage === 'discover' && <span>{step + 1} / {prompts.length}</span>}
      {isReflectStart && historyButton}
    </div>}

    {message && <p className="flow-engine-message" role="status">{message}<button aria-label="Dismiss message" onClick={() => setMessage('')}><X size={15} /></button></p>}

    {stage === 'home' && <section className="flow-intro">
      <h2>What helps you focus?</h2>
      <p>Think of a recent moment when work felt good. We’ll go one question at a time.</p>
      <button type="button" className="flow-primary" onClick={startDiscovery}>Start reflection <ArrowRight size={19} aria-hidden="true" /></button>
    </section>}

    {stage === 'discover' && <DiscoveryQuestion step={step} answers={answers} onChange={answer => setAnswers(current => current.map((item, index) => index === step ? answer : item))} onNext={nextQuestion} />}

    {stage === 'review' && draft && <section className="flow-result">
      <DiscoveryConversation answers={answers} />
      <h1 tabIndex={-1}>Your reflection</h1>
      <p className="flow-subtitle">Here’s what stood out in your answers.</p>
      <DiscoveryResults discovery={draft} showAnswers={false} />
      <button type="button" className="flow-primary" onClick={saveDiscovery}>Save reflection <Check size={19} aria-hidden="true" /></button>
    </section>}

    {title && <header className="flow-screen-header"><h1 tabIndex={-1}>{title}</h1></header>}

    {stage === 'history' && <>
      {!sessionsOnly && flow.discoveries.length > 0 && <button type="button" className="flow-history-row" onClick={() => openStage('reflections')}>
        <span>Past reflections</span>
        <span>{flow.discoveries.length}</span>
        <ChevronRight size={17} aria-hidden="true" />
      </button>}
      <details className="flow-history" open>
        <summary><span>Focus sessions</span><span>{sessionSummary.count} {sessionSummary.count === 1 ? 'session' : 'sessions'}</span></summary>
        {sessionSummary.count ? <div className="flow-history-content">
          {sessionSummary.interest !== '—' && <div className="flow-history-metrics">
            <div><span>Average interest</span><strong>{sessionSummary.interest} / 5</strong></div>
            <div><span>Desire to continue</span><strong>{sessionSummary.continueDesire} / 5</strong></div>
            <div><span>Sense of progress</span><strong>{sessionSummary.progress} / 5</strong></div>
          </div>}
          {!sessionsOnly && <h3>Recent sessions</h3>}
          <div className="flow-history-list">{recent.map(session => <article key={session.id}>
            <strong>{session.taskTitle}</strong>
            <span>{dateLabel(session.endedAt)} · {timeLabel(session.endedAt)}</span>
            <span>{sessionMinutes(session.durationMs)}</span>
          </article>)}</div>
        </div> : <p className="muted flow-history-empty">Completed focus sessions will appear here.</p>}
      </details>
      {!sessionsOnly && <details className="flow-history">
        <summary>More tools</summary>
        <div className="flow-history-content flow-tools">
          {tools.map(({ stage, label }) => <button type="button" className="flow-history-row" key={stage} onClick={() => openStage(stage)}>
            <span>{label}</span>
            <ChevronRight size={17} aria-hidden="true" />
          </button>)}
        </div>
      </details>}
    </>}

    {stage === 'reflections' && flow.discoveries[0] && <section className="flow-result">
      <h2>Latest reflection</h2>
      <DiscoveryResults discovery={flow.discoveries[0]} onPlan={() => planFrom(flow.discoveries[0])} />
      {flow.discoveries.length > 1 && <details className="flow-answers">
        <summary>Earlier reflections</summary>
        <div className="flow-discovery-list">{flow.discoveries.slice(1).map(item => <article className="flow-record" key={item.id}>
          <time dateTime={item.createdAt}>{dateLabel(item.createdAt)}</time>
          <p>{[item.enjoyableWork, item.motivation, item.desireToReturn].filter(Boolean).join(' · ')}</p>
          <button type="button" className="flow-text-button" onClick={() => planFrom(item)}>Explore this reflection</button>
        </article>)}</div>
      </details>}
    </section>}

    {stage === 'analyze' && <section className="flow-engine-card">
      <h2>What might be worth testing?</h2>
      <p className="flow-caution">These are clues, not causes or conclusions. You decide which idea is useful.</p>
      {observations.length > 0 ? <div className="flow-observations">{observations.map(item => <article className="flow-observation" key={item.factor}>
        <div><strong>{item.factor}</strong><span>{item.sessionCount} linked {item.sessionCount === 1 ? 'session' : 'sessions'}</span></div>
        <p>Interest averaged {item.averageInterest.toFixed(1)} / 5 and progress {item.averageProgress.toFixed(1)} / 5 when this was selected.</p>
        <button className="flow-text-button" onClick={() => { setHypothesisText(hypothesisSuggestion(item.factor)); setStage('analyze') }}>Explore this possibility</button>
      </article>)}</div> : <p className="muted">Start a reflection to think about what helped, then write an idea to try.</p>}
      <form className="flow-engine-form" onSubmit={saveHypothesis}>
        <label>Your working hypothesis<textarea rows={3} value={hypothesisText} onChange={event => setHypothesisText(event.target.value)} placeholder="I might enjoy tasks more when…" /></label>
        {flow.discoveries.length > 0 && <label>Connect a reflection<select value={selectedDiscoveryId} onChange={event => setSelectedDiscoveryId(event.target.value)}><option value="">No reflection selected</option>{flow.discoveries.map(item => <option key={item.id} value={item.id}>{dateLabel(item.createdAt)} · {item.enjoyableWork || item.motivation || item.desireToReturn}</option>)}</select></label>}
        <button className="button button-dark" type="submit" disabled={!hypothesisText.trim()}>Save hypothesis</button>
      </form>
      {flow.hypotheses.length > 0 && <div className="flow-record-list"><h3>Ideas to explore</h3>{flow.hypotheses.map(item => <article className={`flow-record ${item.status === 'rejected' ? 'muted-record' : ''}`} key={item.id}>
        <p>{item.statement}</p><span className="flow-record-status">{item.status === 'active' ? 'Open to testing' : 'Set aside'}</span>
        {item.status === 'active' && <button className="flow-text-button" onClick={() => { setExperimentHypothesisId(item.id); setStage('experiment') }}>Try this in a session</button>}
        {item.status === 'active' && <button className="flow-icon-button" aria-label="Set hypothesis aside" onClick={() => rejectHypothesis(item.id)}><X size={16} /></button>}
      </article>)}</div>}
    </section>}

    {stage === 'experiment' && <section className="flow-engine-card">
      <h2>Try one small condition.</h2>
      <p className="muted">Start with a real focus session. Check-ins stay in your existing history; here you only link them to an idea.</p>
      <form className="flow-engine-form" onSubmit={startExperiment}>
        <label>Working hypothesis<select value={experimentHypothesisId} onChange={event => setExperimentHypothesisId(event.target.value)}><option value="">Choose an idea</option>{activeHypotheses.map(item => <option key={item.id} value={item.id}>{item.statement}</option>)}</select></label>
        <label>What will you try?<textarea rows={2} value={condition} onChange={event => setCondition(event.target.value)} placeholder="For example, choose the first step myself…" /></label>
        <button className="button button-dark" type="submit" disabled={!experimentHypothesisId || !condition.trim()}>Start experiment</button>
      </form>
      {flow.experiments.length > 0 && <div className="flow-record-list"><h3>Experiments</h3>{flow.experiments.map(item => {
        const hypothesis = flow.hypotheses.find(entry => entry.id === item.hypothesisId)
        return <article className="flow-record" key={item.id}>
          <div className="flow-record-top"><strong>{item.condition}</strong><span className="flow-record-status">{item.status === 'active' ? 'In progress' : 'Completed'}</span></div>
          {hypothesis && <p className="muted">Testing: {hypothesis.statement}</p>}
          <p>{item.sessionIds.length} focus {item.sessionIds.length === 1 ? 'session' : 'sessions'} linked</p>
          {item.status === 'active' && <>
            <button className="flow-text-button" onClick={() => setSelectedExperimentId(item.id)}>Link a recent session</button>
            {item.id === selectedExperiment?.id && <div className="flow-session-list">{[...data.sessions].sort((a, b) => b.endedAt.localeCompare(a.endedAt)).slice(0, 8).map(session => <button key={session.id} disabled={item.sessionIds.includes(session.id)} onClick={() => linkSession(item.id, session.id)}><span>{sessionLabel(session.id)}</span>{item.sessionIds.includes(session.id) ? <Check size={16} /> : <span>Link</span>}</button>)}</div>}
            <button className="flow-text-button" disabled={item.sessionIds.length === 0} onClick={() => finishExperiment(item.id)}>Finish experiment</button>
          </>}
        </article>
      })}</div>}
    </section>}

    {stage === 'principle' && <section className="flow-engine-card">
      <h2>Keep what repeats and helps.</h2>
      <p className="muted">A tentative principle needs at least two linked sessions. Edit or set it aside whenever your experience changes.</p>
      {flow.experiments.length === 0 && <p className="muted">Your experiments and linked focus sessions will appear here.</p>}
      <div className="flow-record-list">{flow.experiments.map(experiment => {
        const hypothesis = flow.hypotheses.find(item => item.id === experiment.hypothesisId)
        const principle = flow.principles.find(item => item.experimentId === experiment.id)
        return <article className="flow-record" key={experiment.id}>
          <div className="flow-record-top"><strong>{experiment.condition}</strong><span className="flow-record-status">{experiment.sessionIds.length} sessions</span></div>
          {hypothesis && <p className="muted">Idea: {hypothesis.statement}</p>}
          {!principle && <button className="button button-dark" disabled={!canDistillPrinciple(experiment) || !hypothesis} onClick={() => createPrinciple(experiment.id)}>Draft a principle</button>}
          {principle && <div className={`flow-principle ${principle.status === 'rejected' ? 'muted-record' : ''}`}>
            {editingPrincipleId === principle.id ? <><label>Edit your principle<textarea rows={3} value={principleText} onChange={event => setPrincipleText(event.target.value)} /></label><button className="button button-dark" disabled={!principleText.trim()} onClick={() => savePrinciple(principle.id)}>Save changes</button></> : <><p>{principle.text}</p><p className="flow-evidence">Based on {principle.evidenceSessionIds.length} focus sessions. This is a personal observation, not a rule.</p>{principle.status === 'active' ? <><button className="flow-text-button" onClick={() => { setEditingPrincipleId(principle.id); setPrincipleText(principle.text) }}>Edit</button><button className="flow-text-button" onClick={() => rejectPrinciple(principle.id)}>Set aside</button></> : <span className="flow-record-status">Set aside; evidence kept</span>}</>}
          </div>}
          {principle && !principleHasEvidence(principle, experiment) && <p className="flow-caution">This principle has fewer than two evidence sessions now. Add observations before relying on it.</p>}
        </article>
      })}</div>
      {flow.principles.some(item => item.status === 'active') && <div className="flow-record-list"><h3>Your principles</h3>{flow.principles.filter(item => item.status === 'active').map(item => <p className="flow-principle-summary" key={item.id}><Check size={15} />{item.text}</p>)}</div>}
    </section>}

  </main>
}
