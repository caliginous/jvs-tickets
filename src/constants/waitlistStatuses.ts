/**
 * Canonical waitlist status definitions.
 *
 * Use these constants everywhere — never hardcode waitlist status strings.
 */

export const WAITLIST_ENTRY_STATUSES = [
  'ACTIVE',
  'OFFERED',
  'FULFILLED',
  'EXPIRED',
  'REMOVED',
  'DECLINED',
] as const;

export type WaitlistEntryStatus = (typeof WAITLIST_ENTRY_STATUSES)[number];

/** Statuses that block duplicate joins (DB partial unique index also enforces this) */
export const ACTIVE_LIKE_ENTRY_STATUSES: WaitlistEntryStatus[] = ['ACTIVE', 'OFFERED'];

/** Terminal statuses — entry is no longer in the queue */
export const TERMINAL_ENTRY_STATUSES: WaitlistEntryStatus[] = ['FULFILLED', 'EXPIRED', 'REMOVED', 'DECLINED'];

export const WAITLIST_OFFER_STATUSES = [
  'ACTIVE',
  'CLAIMED',
  'EXPIRED',
  'DECLINED',
  'CANCELLED',
] as const;

export type WaitlistOfferStatus = (typeof WAITLIST_OFFER_STATUSES)[number];

/** Audit log action names */
export const WAITLIST_ACTIONS = {
  JOINED_WAITLIST: 'JOINED_WAITLIST',
  OFFER_CREATED: 'OFFER_CREATED',
  OFFER_CLAIMED: 'OFFER_CLAIMED',
  OFFER_DECLINED: 'OFFER_DECLINED',
  OFFER_EXPIRED: 'OFFER_EXPIRED',
  OFFER_EXPIRED_LAZY: 'OFFER_EXPIRED_LAZY',
  OFFER_CANCELLED_BY_ADMIN: 'OFFER_CANCELLED_BY_ADMIN',
  OFFER_MANUALLY_EXPIRED: 'OFFER_MANUALLY_EXPIRED',
  OFFER_EMAIL_SENT: 'OFFER_EMAIL_SENT',
  OFFER_EMAIL_RESENT: 'OFFER_EMAIL_RESENT',
  ENTRY_FULFILLED: 'ENTRY_FULFILLED',
  ENTRY_REMOVED_BY_ADMIN: 'ENTRY_REMOVED_BY_ADMIN',
  CLAIM_SESSION_CREATED: 'CLAIM_SESSION_CREATED',
  ASSIGNMENT_SKIPPED_INSUFFICIENT_CAPACITY: 'ASSIGNMENT_SKIPPED_INSUFFICIENT_CAPACITY',
} as const;
