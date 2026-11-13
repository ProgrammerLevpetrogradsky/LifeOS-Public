import { Check, ChevronDown, Folder, type LucideIcon } from 'lucide-react'
import { useRef, useState, type RefObject } from 'react'

import type { JournalFolder } from '../data'
import { FolderGlyph } from './FolderGlyph'
import { JournalSheet } from './JournalSheet'

type FolderOption = { value: string; label: string; icon?: LucideIcon; folder?: JournalFolder }

export default function FolderPicker({ label, value, options, onChange }: {
  label: string
  value: string
  options: FolderOption[]
  onChange: (value: string) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const selected = options.find(option => option.value === value)
  const SelectedIcon = selected?.icon ?? Folder

  return <div className="journal-folder-picker">
    <button type="button" className="journal-folder-trigger" aria-haspopup="dialog"
      aria-label={`${label}: ${selected?.label ?? 'Choose a folder'}`} onClick={() => dialog.current?.showModal()}>
      {selected?.folder ? <FolderGlyph {...selected.folder} /> : <SelectedIcon size={17} aria-hidden="true" />}
      <span>{selected?.label ?? 'Choose a folder'}</span>
      <ChevronDown size={16} aria-hidden="true" />
    </button>
    <FolderSheet dialog={dialog} label={label} value={value} options={options} onChange={onChange} />
  </div>
}

export function FolderSheet({ dialog, label, value, options, onChange }: {
  dialog: RefObject<HTMLDialogElement | null>
  label: string
  value: string
  options: FolderOption[]
  onChange: (value: string) => boolean | void
}) {
  const [saveFailed, setSaveFailed] = useState(false)

  return <JournalSheet dialog={dialog} label={label} closeLabel="Close folder picker" onClose={() => setSaveFailed(false)}>
    <ul>{options.map(option => <li key={option.value}>
      <button type="button" aria-pressed={option.value === value} onClick={() => {
        if (option.value !== value && onChange(option.value) === false) {
          setSaveFailed(true)
          return
        }
        dialog.current?.close()
      }}>
        {option.folder ? <FolderGlyph {...option.folder} /> : option.icon && <option.icon size={17} aria-hidden="true" />}
        <span>{option.label}</span>
        {option.value === value && <Check size={18} aria-hidden="true" />}
      </button>
    </li>)}</ul>
    {saveFailed && <p className="journal-photo-error" role="alert">Couldn’t move this entry. Try again.</p>}
  </JournalSheet>
}
