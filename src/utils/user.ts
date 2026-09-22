export function getFirstName(displayName?: string | null) {
  return displayName?.trim().split(/\s+/)[0] || 'there'
}

export function getUserInitials(displayName?: string | null, email?: string | null) {
  const nameParts = displayName?.trim().split(/\s+/).filter(Boolean) ?? []

  if (nameParts.length > 1) {
    return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
  }

  return (nameParts[0]?.[0] || email?.[0] || 'S').toUpperCase()
}
