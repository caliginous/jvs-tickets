import { useMemo } from 'react';
import { format } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';

// Convert local date + time + timezone to UTC
export function toUTC(date: Date, time: string, tz: string): Date {
  const [h, m] = time.split(':').map(Number);
  const local = new Date(date);
  local.setHours(h, m, 0, 0);
  
  // Convert to UTC using the specified timezone
  const zoned = zonedTimeToUtc(local, tz);
  return zoned;
}

// Convert UTC date back to a specific timezone
export function fromUTC(utcDate: Date, tz: string): Date {
  return utcToZonedTime(utcDate, tz);
}

// Format date for display in a specific timezone
export function formatInTimezone(date: Date, tz: string, formatString: string = 'PPpp'): string {
  const zonedDate = utcToZonedTime(date, tz);
  return format(zonedDate, formatString);
}

// Common timezone options
export const COMMON_TIMEZONES = [
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'America/New_York', label: 'New York (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
  { value: 'UTC', label: 'UTC' },
];

// Validate time string format (HH:mm)
export function isValidTime(time: string): boolean {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

// Get current time in HH:mm format
export function getCurrentTime(): string {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

// Simple, dependency-free fixed-timezone formatter using Intl
export function formatInTZ(
  date: string | number | Date,
  opts: Intl.DateTimeFormatOptions,
  timeZone: string = 'Europe/London',
  locale: string = 'en-GB'
) {
  const d = new Date(date);
  return new Intl.DateTimeFormat(locale, { timeZone, ...opts }).format(d);
}

// Optional React hook if you want memoised strings in components
export function useFormatInTZ(
  date: string | number | Date,
  opts: Intl.DateTimeFormatOptions,
  timeZone: string = 'Europe/London',
  locale: string = 'en-GB'
) {
  return useMemo(() => formatInTZ(date, opts, timeZone, locale), [date, timeZone, locale, opts]);
}
