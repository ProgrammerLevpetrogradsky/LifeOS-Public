import { BellRing } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function BreakReminder({ dueAt, onResume, onDismiss }: {
  dueAt: number
  onResume: () => void
  onDismiss: () => void
}) {
  const [observedAt, setObservedAt] = useState(Date.now)

  useEffect(() => {
    let timer: number | undefined
    const refresh = () => {
      window.clearTimeout(timer)
      const now = Date.now()
      setObservedAt(now)
      if (now < dueAt) timer = window.setTimeout(refresh, Math.min(dueAt - now, 2_147_483_647))
    }
    refresh()
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [dueAt])

  if (observedAt < dueAt) return null
  return (
    <aside className="focus-break-reminder" aria-label="Focus break reminder">
      <div className="focus-break-reminder__copy" role="status">
        <BellRing size={18} aria-hidden="true" />
        <strong>Ready to get back to focus?</strong>
      </div>
      <div className="focus-break-reminder__actions">
        <button type="button" onClick={onDismiss} aria-label="Dismiss break reminder">Dismiss</button>
        <button type="button" onClick={onResume}>Resume focus</button>
      </div>
    </aside>
  )
}
