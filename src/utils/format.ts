export function formatDateTime(value: string | null) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatDate(value: string | null) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    // Operational due dates are stored as UTC end-of-day timestamps. Formatting
    // them in UTC preserves the calendar date selected by the Supervisor.
    timeZone: 'UTC',
  }).format(new Date(value))
}
