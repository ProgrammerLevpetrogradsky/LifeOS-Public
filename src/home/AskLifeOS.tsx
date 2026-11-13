import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, MessageCircle } from 'lucide-react'
import { answerLifeOS, starterQuestions, type GuideAnswer, type GuideTopic } from './lifeosGuide'
import './ask-lifeos.css'

type Exchange = { question: string; answer: GuideAnswer }
type Actions = Partial<Record<GuideTopic, () => void>>
const actionLabels: Record<GuideTopic, string> = {
  tasks: 'Open Tasks', journal: 'Open Journal', focus: 'Start Focus', reflect: 'Open Reflect', settings: 'Open Settings',
}

export default function AskLifeOS({ actions }: { actions: Actions }) {
  const [question, setQuestion] = useState('')
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const messages = useRef<HTMLDivElement>(null)
  const prompts = exchanges.at(-1)?.answer.followUps ?? starterQuestions

  useEffect(() => {
    if (messages.current) messages.current.scrollTop = messages.current.scrollHeight
  }, [exchanges])

  function ask(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return
    const localAnswer = answerLifeOS(trimmed, exchanges.at(-1)?.answer.context)
    setExchanges(current => [...current.slice(-4), { question: trimmed, answer: localAnswer }])
    setQuestion('')
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    ask(question)
    event.currentTarget.querySelector('input')?.blur()
  }

  return <section className="life-main-guide" aria-labelledby="life-main-guide-title">
    <div className="life-main-guide-heading">
      <span className="life-main-guide-icon"><MessageCircle size={19} aria-hidden="true" /></span>
      <div>
        <h2 id="life-main-guide-title">Hi there!</h2>
        <p>I can help you find your way around LifeOS.</p>
      </div>
    </div>
    {exchanges.length > 0 && <div className="life-main-guide-conversation">
      <div ref={messages} className="life-main-guide-messages" role="log" aria-label="LifeOS help answers" aria-live="polite">
        {exchanges.map((exchange, index) => <div className="life-main-guide-exchange" key={index}>
          <p className="life-main-guide-question">{exchange.question}</p>
          <div className="life-main-guide-reply">
            <p className="life-main-guide-answer">{exchange.answer.text}</p>
            {exchange.answer.steps && exchange.answer.steps.length > 0 && <ol>
              {exchange.answer.steps.map(step => <li key={step}>{step}</li>)}
            </ol>}
          </div>
          {exchange.answer.topic && actions[exchange.answer.topic] && <button type="button" className="life-main-guide-link"
            onClick={actions[exchange.answer.topic]}>{actionLabels[exchange.answer.topic]} <ArrowRight size={15} aria-hidden="true" /></button>}
        </div>)}
      </div>
    </div>}
    <div className="life-main-guide-prompts" aria-label="Suggested questions">
      <p>{exchanges.length ? 'You could also ask:' : 'Try one of these:'}</p>
      <div>{prompts.map(prompt => <button type="button" key={prompt} onClick={() => ask(prompt)}>{prompt}<ArrowRight size={15} aria-hidden="true" /></button>)}</div>
    </div>
    <form className="life-main-guide-form" onSubmit={submit}>
      <label className="journal-sr-only" htmlFor="life-main-guide-question">Ask about LifeOS</label>
      <input id="life-main-guide-question" value={question} maxLength={160} placeholder="Ask about LifeOS…"
        onChange={event => setQuestion(event.target.value)} />
      <button type="submit" aria-label="Ask LifeOS" disabled={!question.trim()}><ArrowRight size={18} aria-hidden="true" /></button>
    </form>
    <p className="life-main-guide-disclaimer">Local guide · preset answers, no account needed</p>
  </section>
}
