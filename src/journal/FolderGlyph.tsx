import { BookOpen, BriefcaseBusiness, Camera, Folder, Heart, Leaf, Lightbulb, Star, type LucideIcon } from 'lucide-react'
import type { JournalFolderAppearance } from '../data'

const icons: Record<NonNullable<JournalFolderAppearance['icon']>, { icon: LucideIcon; label: string }> = {
  folder: { icon: Folder, label: 'Folder' },
  briefcase: { icon: BriefcaseBusiness, label: 'Briefcase' },
  book: { icon: BookOpen, label: 'Book' },
  heart: { icon: Heart, label: 'Heart' },
  star: { icon: Star, label: 'Star' },
  lightbulb: { icon: Lightbulb, label: 'Lightbulb' },
  leaf: { icon: Leaf, label: 'Leaf' },
  camera: { icon: Camera, label: 'Camera' },
}

export const folderIconLabel = (icon: NonNullable<JournalFolderAppearance['icon']>) => icons[icon].label

export function FolderGlyph({ color = 'blue', icon = 'folder', size = 17 }: JournalFolderAppearance & { size?: number }) {
  const Icon = icons[icon].icon
  return <span className="journal-folder-glyph" data-folder-color={color} aria-hidden="true"><Icon size={size} /></span>
}
