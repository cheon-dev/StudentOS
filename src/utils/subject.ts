export function formatSubjectTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number)

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return value
  }

  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours % 12 || 12

  return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`
}
