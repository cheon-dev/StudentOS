import type { LucideIcon } from 'lucide-react'
import { BookOpen, Calculator, Code2, FlaskConical, Globe2, Palette } from 'lucide-react'
import type { SubjectColor, SubjectIcon as SubjectIconName } from '../../types/subject.ts'

const subjectIconMap: Record<SubjectIconName, LucideIcon> = {
  book: BookOpen,
  code: Code2,
  flask: FlaskConical,
  calculator: Calculator,
  globe: Globe2,
  palette: Palette,
}

type SubjectIconProps = {
  icon: SubjectIconName
  color: SubjectColor
  size?: number
}

export function SubjectIcon({ icon, color, size = 21 }: SubjectIconProps) {
  const Icon = subjectIconMap[icon] ?? BookOpen

  return (
    <span className={`subject-symbol subject-symbol--${color}`}>
      <Icon size={size} strokeWidth={1.8} aria-hidden="true" />
    </span>
  )
}
