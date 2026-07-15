/** Greeting based on the device's current hour. */
export function getGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** First word of a full name. */
export function getFirstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** "KES 8,000/day" — thousands separated, no decimals. */
export function formatRate(amount: number, suffix = '/day'): string {
  return `KES ${amount.toLocaleString('en-KE')}${suffix}`;
}

/** Plain thousands separator, e.g. 3200 -> "3,200". */
export function formatNumber(value: number): string {
  return value.toLocaleString('en-KE');
}

/** Truncate to a max length, appending an ellipsis. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '…';
}

/** "10:42 AM" — the small timestamp shown under a chat bubble/group. */
export function formatMessageTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleTimeString('en-KE', { hour: 'numeric', minute: '2-digit' });
}

/** "Today" / "Yesterday" / "12 March" — date separator between groups of messages. */
export function formatDateSeparator(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString('en-KE', { day: 'numeric', month: 'long' });
}

/** Same calendar day? — used to decide where date separators go. */
export function isSameDay(a: string | Date, b: string | Date): boolean {
  const d1 = typeof a === 'string' ? new Date(a) : a;
  const d2 = typeof b === 'string' ? new Date(b) : b;
  return d1.toDateString() === d2.toDateString();
}

/** "5 minutes ago" / "3 hours ago" / "2 days ago" / falls back to a short date beyond a week. */
export function formatRelativeTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}

/** 'today' if the date is within the last 24h, else 'earlier' — used to group notification lists. */
export function relativeGroup(value: string | Date): 'today' | 'earlier' {
  const date = typeof value === 'string' ? new Date(value) : value;
  const isToday = Date.now() - date.getTime() < 24 * 60 * 60 * 1000;
  return isToday ? 'today' : 'earlier';
}
