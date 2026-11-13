import { X } from 'lucide-react'
import { useId, type ReactNode, type RefObject } from 'react'

export function JournalSheet({ dialog, label, closeLabel, onClose, children }: {
  dialog: RefObject<HTMLDialogElement | null>
  label: string
  closeLabel: string
  onClose?: () => void
  children: ReactNode
}) {
  const titleId = useId()
  const close = () => dialog.current?.close()

  return <dialog ref={dialog} className="journal-sheet" aria-labelledby={titleId}
    onClose={onClose} onClick={event => { if (event.target === event.currentTarget) close() }}>
    <div className="journal-sheet-body">
      <header>
        <h2 id={titleId}>{label}</h2>
        <button type="button" className="journal-icon" aria-label={closeLabel} onClick={close}>
          <X size={19} aria-hidden="true" />
        </button>
      </header>
      {children}
    </div>
  </dialog>
}
