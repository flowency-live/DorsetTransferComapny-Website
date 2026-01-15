/**
 * Format time to 12-hour format with am/pm
 * @param dateString ISO 8601 date string or Date object
 * @returns Formatted time string (e.g., "9:00 AM" or "9:30 PM")
 */
export function formatTime12Hour(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format time for display with am/pm suffix
 * Used in all quote screens for consistency
 */
export function getFormattedTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
