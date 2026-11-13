import { ArrowRight, Check, ChevronRight, Settings2, Sparkles, Target, Zap } from 'lucide-react'
import type { FlowDiscovery, FlowSignal } from '../data'

type Choice = { label: string; signal: FlowSignal }

export const prompts = [
  {
    field: 'enjoyableWork',
    question: 'What felt good?',
    choices: [
      { label: 'Seeing progress', signal: 'Fast Feedback' },
      { label: 'Doing it my way', signal: 'Personal Control' },
      { label: 'Working on something I care about', signal: 'Meaningful Goal' },
    ],
  },
  {
    field: 'motivation',
    question: 'What kept you going?',
    choices: [
      { label: 'A quick win', signal: 'Fast Feedback' },
      { label: 'Choosing the next step', signal: 'Personal Control' },
      { label: 'Knowing why it mattered', signal: 'Meaningful Goal' },
    ],
  },
  {
    field: 'desireToReturn',
    question: 'What would you try again?',
    choices: [
      { label: 'Check my progress', signal: 'Fast Feedback' },
      { label: 'Pick my own approach', signal: 'Personal Control' },
      { label: 'Set a goal I care about', signal: 'Meaningful Goal' },
    ],
  },
] satisfies { field: 'enjoyableWork' | 'motivation' | 'desireToReturn'; question: string; choices: Choice[] }[]

export type Answer = { choice: number; custom: string }
export const emptyAnswers = (): Answer[] => prompts.map(() => ({ choice: -1, custom: '' }))

export function answerText(step: number, answer: Answer): string {
  return prompts[step].choices[answer.choice]?.label ?? answer.custom.trim()
}

export function discoveryFromAnswers(answers: Answer[]): FlowDiscovery {
  const signals = answers.flatMap((answer, index) => {
    const signal = prompts[index].choices[answer.choice]?.signal
    return signal ? [signal] : []
  })
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    enjoyableWork: answerText(0, answers[0]),
    motivation: answerText(1, answers[1]),
    desireToReturn: answerText(2, answers[2]),
    signals: [...new Set(signals)],
  }
}

export function DiscoveryConversation({ answers }: { answers: Answer[] }) {
  if (!answers.length) return null
  return <ol className="flow-conversation" aria-label="Earlier questions and answers">
    {answers.map((answer, index) => <li key={prompts[index].field}>
      <p className="flow-bubble flow-bubble-prompt">{prompts[index].question}</p>
      <p className="flow-bubble flow-bubble-answer">
        <span className="flow-bubble-speaker">You</span>
        {answerText(index, answer)}
      </p>
    </li>)}
  </ol>
}

export function DiscoveryQuestion({ step, answers, onChange, onNext }: {
  step: number
  answers: Answer[]
  onChange: (answer: Answer) => void
  onNext: () => void
}) {
  const answer = answers[step]
  const prompt = prompts[step]
  const other = prompt.choices.length

  return <form className="flow-question" onSubmit={event => { event.preventDefault(); if (answerText(step, answer)) onNext() }}>
    <progress className="flow-progress" max={prompts.length} value={step + 1} aria-label="Reflection progress" />
    <DiscoveryConversation answers={answers.slice(0, step)} />
    <h1 id="flow-title" className="flow-bubble flow-bubble-prompt" tabIndex={-1}>{prompt.question}</h1>
    <fieldset className="flow-choices" aria-labelledby="flow-title">
      {[...prompt.choices.map(choice => choice.label), 'Write my own'].map((label, index) => <label className="flow-choice" key={label}>
        <input type="radio" name="discovery-answer" checked={answer.choice === index} onChange={() => onChange({ ...answer, choice: index })} />
        <span className="flow-radio" aria-hidden="true"><Check size={11} strokeWidth={3} /></span>
        <span>{label}</span>
      </label>)}
      {answer.choice === other && <label className="flow-custom">
        Your answer
        <textarea value={answer.custom} onChange={event => onChange({ ...answer, custom: event.target.value })} maxLength={500} rows={2} />
      </label>}
    </fieldset>
    <button className="flow-primary" type="submit" disabled={!answerText(step, answer)}>
      {step === prompts.length - 1 ? 'See summary' : 'Next'} <ArrowRight size={19} />
    </button>
  </form>
}

const signalCards = {
  'Meaningful Goal': { icon: Target, color: 'rose', title: 'A goal that matters', description: 'Keep the result you want in sight.' },
  'Fast Feedback': { icon: Zap, color: 'blue', title: 'Seeing progress', description: 'Look for a small sign you’re moving forward.' },
  'Personal Control': { icon: Settings2, color: 'mint', title: 'Doing it your way', description: 'Give yourself a say in how you start.' },
} satisfies Record<FlowSignal, { icon: typeof Target; color: string; title: string; description: string }>

export function DiscoveryResults({ discovery, onPlan, showAnswers = true }: {
  discovery: FlowDiscovery
  onPlan?: () => void
  showAnswers?: boolean
}) {
  const signals = discovery.signals ?? []
  return <>
    {signals.length > 0 && <div className="flow-menu">
      {signals.map(signal => {
        const { icon: Icon, color, title, description } = signalCards[signal]
        return <article className="flow-tile" key={signal}>
          <span className={`flow-tile-icon ${color}`}><Icon size={26} /></span>
          <span className="flow-tile-copy"><strong>{title}</strong><span>{description}</span></span>
        </article>
      })}
    </div>}
    {showAnswers && <details className="flow-answers" open={signals.length === 0 ? true : undefined}>
      <summary>Your answers</summary>
      <dl>{prompts.map(({ field, question }) => discovery[field] && <div key={field}>
        <dt>{question}</dt><dd>{discovery[field]}</dd>
      </div>)}</dl>
    </details>}
    {onPlan && <button type="button" className="flow-tile flow-plan" onClick={onPlan}>
      <span className="flow-tile-icon purple"><Sparkles size={22} /></span>
      <span className="flow-tile-copy"><strong>Try an idea</strong><span>Pick one thing to try next time.</span></span>
      <ChevronRight size={18} />
    </button>}
  </>
}
