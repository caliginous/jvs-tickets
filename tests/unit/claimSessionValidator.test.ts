/**
 * Tests for claim session validation logic.
 * Mocks Prisma to test validation rules in isolation.
 */

const mockFindUniqueClaimSession = jest.fn();
const mockFindFirstOffer = jest.fn();

jest.mock('../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    waitlistClaimSession: { findUnique: (...args: any[]) => mockFindUniqueClaimSession(...args) },
    waitlistOffer: { findFirst: (...args: any[]) => mockFindFirstOffer(...args) },
  },
}));

import { validateClaimSession } from '../../src/lib/services/waitlist/claimSessionValidator';

describe('validateClaimSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const futureDate = new Date(Date.now() + 600000);

  const baseOffer = {
    id: 'offer-1',
    waitlistEntryId: 'entry-1',
    eventDateId: 10,
    eventTicketTypeId: 5,
    quantity: 2,
    status: 'ACTIVE',
    expiresAt: futureDate,
  };

  const baseClaimSession = {
    id: 'cs-1',
    waitlistOfferId: 'offer-1',
    token: 'tok-abc',
    expiresAt: futureDate,
    usedAt: null,
  };

  const validInput = {
    claimSessionToken: 'tok-abc',
    eventDateId: 10,
    tickets: [{ eventTicketTypeId: 5, quantity: 2 }],
  };

  it('returns valid when session and offer are good and tickets match', async () => {
    mockFindUniqueClaimSession.mockResolvedValue(baseClaimSession);
    mockFindFirstOffer.mockResolvedValue(baseOffer);

    const result = await validateClaimSession(validInput);
    expect(result.valid).toBe(true);
  });

  it('rejects when claim session not found', async () => {
    mockFindUniqueClaimSession.mockResolvedValue(null);

    const result = await validateClaimSession(validInput);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain('not found');
  });

  it('rejects when claim session already used', async () => {
    mockFindUniqueClaimSession.mockResolvedValue({ ...baseClaimSession, usedAt: new Date() });

    const result = await validateClaimSession(validInput);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain('already been used');
  });

  it('rejects when claim session expired', async () => {
    mockFindUniqueClaimSession.mockResolvedValue({ ...baseClaimSession, expiresAt: new Date(Date.now() - 1000) });

    const result = await validateClaimSession(validInput);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain('expired');
  });

  it('rejects when associated offer not found', async () => {
    mockFindUniqueClaimSession.mockResolvedValue(baseClaimSession);
    mockFindFirstOffer.mockResolvedValue(null);

    const result = await validateClaimSession(validInput);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain('not found');
  });

  it('rejects when offer is not ACTIVE', async () => {
    mockFindUniqueClaimSession.mockResolvedValue(baseClaimSession);
    mockFindFirstOffer.mockResolvedValue({ ...baseOffer, status: 'EXPIRED' });

    const result = await validateClaimSession(validInput);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain('no longer active');
  });

  it('rejects when offer has expired', async () => {
    mockFindUniqueClaimSession.mockResolvedValue(baseClaimSession);
    mockFindFirstOffer.mockResolvedValue({ ...baseOffer, expiresAt: new Date(Date.now() - 1000) });

    const result = await validateClaimSession(validInput);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain('expired');
  });

  it('rejects when eventDateId does not match offer', async () => {
    mockFindUniqueClaimSession.mockResolvedValue(baseClaimSession);
    mockFindFirstOffer.mockResolvedValue(baseOffer);

    const result = await validateClaimSession({ ...validInput, eventDateId: 999 });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain('does not match');
  });

  it('rejects when total quantity does not match offer', async () => {
    mockFindUniqueClaimSession.mockResolvedValue(baseClaimSession);
    mockFindFirstOffer.mockResolvedValue(baseOffer);

    const result = await validateClaimSession({
      ...validInput,
      tickets: [{ eventTicketTypeId: 5, quantity: 5 }],
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain('does not match offer quantity');
  });

  it('rejects when ticket type does not match offer', async () => {
    mockFindUniqueClaimSession.mockResolvedValue(baseClaimSession);
    mockFindFirstOffer.mockResolvedValue(baseOffer);

    const result = await validateClaimSession({
      ...validInput,
      tickets: [{ eventTicketTypeId: 99, quantity: 2 }],
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain('must match');
  });

  it('rejects claim session reuse (usedAt set)', async () => {
    mockFindUniqueClaimSession.mockResolvedValue({ ...baseClaimSession, usedAt: new Date() });

    const result = await validateClaimSession(validInput);
    expect(result.valid).toBe(false);
  });
});
