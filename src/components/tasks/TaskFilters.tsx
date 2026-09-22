import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react'
import type { Subject } from '../../types/subject.ts'
import { taskPriorities, taskTypes, type TaskPriority, type TaskStatus, type TaskType } from '../../types/task.ts'

export type TaskViewFilter = 'all' | 'pending' | 'in-progress' | 'completed' | 'overdue' | 'today' | 'upcoming'
export type TaskSort = 'default' | 'due' | 'priority' | 'created' | 'title'

export type TaskFilterValues = {
  search: string
  status: TaskStatus | 'all'
  priority: TaskPriority | 'all'
  subjectId: string | 'all'
  type: TaskType | 'all'
  sort: TaskSort
}

type TaskFiltersProps = {
  values: TaskFilterValues
  subjects: Subject[]
  view: TaskViewFilter
  counts: Record<TaskViewFilter, number>
  onViewChange: (view: TaskViewFilter) => void
  onChange: (field: keyof TaskFilterValues, value: string) => void
  onClear: () => void
}

const summaryFilters: { label: string; value: TaskViewFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Today', value: 'today' },
  { label: 'Upcoming', value: 'upcoming' },
]

export function TaskFilters({ values, subjects, view, counts, onViewChange, onChange, onClear }: TaskFiltersProps) {
  const filtersActive = values.search.trim() || values.status !== 'all' || values.priority !== 'all' || values.subjectId !== 'all' || values.type !== 'all' || values.sort !== 'default'

  return (
    <div className="tasks-controls">
      <div className="task-summary-tabs" role="tablist" aria-label="Task summary filters">
        {summaryFilters.map((filter) => (
          <button className={view === filter.value ? 'task-summary-tab task-summary-tab--active' : 'task-summary-tab'} type="button" role="tab" aria-selected={view === filter.value} onClick={() => onViewChange(filter.value)} key={filter.value}>
            {filter.label}<span>{counts[filter.value]}</span>
          </button>
        ))}
      </div>
      <div className="task-filter-toolbar">
        <label className="task-search">
          <Search size={16} strokeWidth={1.8} aria-hidden="true" />
          <input type="search" value={values.search} placeholder="Search tasks" aria-label="Search tasks" onChange={(event) => onChange('search', event.target.value)} />
        </label>
        <div className="task-select-group">
          <SlidersHorizontal size={14} strokeWidth={1.8} aria-hidden="true" />
          <select aria-label="Filter by status" value={values.status} onChange={(event) => onChange('status', event.target.value)}>
            <option value="all">All status</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
          <select aria-label="Filter by priority" value={values.priority} onChange={(event) => onChange('priority', event.target.value)}>
            <option value="all">All priority</option>
            {taskPriorities.map((priority) => <option value={priority} key={priority}>{priority}</option>)}
          </select>
          <select aria-label="Filter by subject" value={values.subjectId} onChange={(event) => onChange('subjectId', event.target.value)}>
            <option value="all">All subjects</option>
            <option value="general">General tasks</option>
            {subjects.map((subject) => <option value={subject.id} key={subject.id}>{subject.name}</option>)}
          </select>
          <select aria-label="Filter by task type" value={values.type} onChange={(event) => onChange('type', event.target.value)}>
            <option value="all">All types</option>
            {taskTypes.map((type) => <option value={type} key={type}>{type}</option>)}
          </select>
          <select aria-label="Sort tasks" value={values.sort} onChange={(event) => onChange('sort', event.target.value)}>
            <option value="default">Sort: Smart</option>
            <option value="due">Sort: Due date</option>
            <option value="priority">Sort: Priority</option>
            <option value="created">Sort: Recently created</option>
            <option value="title">Sort: Title</option>
          </select>
        </div>
        {filtersActive && <button className="clear-filters-button" type="button" onClick={onClear}><RotateCcw size={14} strokeWidth={1.8} /> Clear</button>}
      </div>
    </div>
  )
}
