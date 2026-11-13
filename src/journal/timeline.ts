import type { JournalEntry } from '../data.ts'

const dateFormatter = new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric' })
const timeFormatter = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' })

export function journalTime(date: string): string {
  return timeFormatter.format(new Date(date))
}

export function journalDate(date: string): string {
  return dateFormatter.format(new Date(date))
}

export function journalDayLabel(date: Date, now: Date): string {
  const day = date.toDateString()
  if (day === now.toDateString()) return 'Today'
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  return day === yesterday.toDateString() ? 'Yesterday' : dateFormatter.format(date)
}

export function groupJournalEntries(entries: JournalEntry[], search: string, now = new Date()) {
  const query = search.trim().toLocaleLowerCase()
  const groups = new Map<string, { label: string; entries: JournalEntry[] }>()

  const sorted = [...entries].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  for (const entry of sorted) {
    const date = new Date(entry.createdAt)
    const key = date.toDateString()
    const label = journalDayLabel(date, now)
    const searchable = [entry.text, label, journalDate(entry.createdAt)].join(' ').toLocaleLowerCase()
    if (query && !searchable.includes(query)) continue

    let group = groups.get(key)
    if (!group) {
      group = { label, entries: [] }
      groups.set(key, group)
    }
    group.entries.push(entry)
  }

  return [...groups.entries()].map(([key, group]) => ({ key, ...group }))
}
