import { localDateTimeToTimestamp } from './task.ts'

export function dateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
export function dateInput(date: Date) { return dateKey(date) }
export function dateFromInput(value: string) { const [year, month, day] = value.split('-').map(Number); return new Date(year, month - 1, day) }
export function addDays(date: Date, amount: number) { const result = new Date(date); result.setDate(result.getDate() + amount); return result }
export function startOfMonth(date: Date) { return new Date(date.getFullYear(), date.getMonth(), 1) }
export function endOfMonth(date: Date) { return new Date(date.getFullYear(), date.getMonth() + 1, 0) }
export function startOfWeek(date: Date) { return addDays(new Date(date.getFullYear(), date.getMonth(), date.getDate()), -date.getDay()) }
export function formatMonth(date: Date) { return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) }
export function formatDayHeading(date: Date) { return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) }
export function dayNameToIndex(day: string) { return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(day) }
export function timestampForDateTime(date: Date, time: string) { return localDateTimeToTimestamp(dateInput(date), time) }
