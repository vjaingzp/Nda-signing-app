// Storage retention policy for signed documents: once a document is fully
// signed, the stored PDF (and, for uploads, the original file) is deleted
// RETENTION_DAYS after that — not from document creation, so time spent as
// a draft never eats into it. REMINDER_WINDOW_DAYS controls how early the
// in-app "download before this expires" notice starts showing.
export const RETENTION_DAYS = 30;
export const REMINDER_WINDOW_DAYS = 7;

export function addRetentionPeriod(from: Date): string {
  const expires = new Date(from);
  expires.setUTCDate(expires.getUTCDate() + RETENTION_DAYS);
  return expires.toISOString();
}

export function daysUntil(isoDate: string): number {
  const ms = new Date(isoDate).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}
