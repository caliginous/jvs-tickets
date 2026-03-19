import {
  orderConsumesCapacity,
  reservesCapacity,
  releasesCapacity,
  ALWAYS_CAPACITY_RESERVED_STATUSES,
  ALWAYS_CAPACITY_RELEASED_STATUSES,
  CONDITIONAL_CAPACITY_STATUSES,
  ALL_ORDER_STATUSES,
} from '../../src/constants/orderStatuses';

describe('orderStatuses', () => {
  describe('status categorisation completeness', () => {
    it('every status in ALL_ORDER_STATUSES is in exactly one category', () => {
      for (const status of ALL_ORDER_STATUSES) {
        const inReserved = (ALWAYS_CAPACITY_RESERVED_STATUSES as readonly string[]).includes(status);
        const inReleased = (ALWAYS_CAPACITY_RELEASED_STATUSES as readonly string[]).includes(status);
        const inConditional = (CONDITIONAL_CAPACITY_STATUSES as readonly string[]).includes(status);
        const count = [inReserved, inReleased, inConditional].filter(Boolean).length;
        expect(count).toBe(1);
      }
    });

    it('REFUNDED and CANCELLED are conditional, not always-released', () => {
      expect((CONDITIONAL_CAPACITY_STATUSES as readonly string[]).includes('REFUNDED')).toBe(true);
      expect((CONDITIONAL_CAPACITY_STATUSES as readonly string[]).includes('CANCELLED')).toBe(true);
      expect((ALWAYS_CAPACITY_RELEASED_STATUSES as readonly string[]).includes('REFUNDED')).toBe(false);
      expect((ALWAYS_CAPACITY_RELEASED_STATUSES as readonly string[]).includes('CANCELLED')).toBe(false);
    });
  });

  describe('orderConsumesCapacity', () => {
    it.each([
      'CONFIRMED', 'PAID', 'COMPLETED', 'PARTIALLY_REFUNDED', 'PENDING',
    ])('always-reserved status %s consumes capacity', (status) => {
      expect(orderConsumesCapacity({ status })).toBe(true);
      expect(orderConsumesCapacity({ status, inventoryReturnedToPool: false })).toBe(true);
      expect(orderConsumesCapacity({ status, inventoryReturnedToPool: true })).toBe(true);
    });

    it.each(['FAILED', 'EXPIRED'])('always-released status %s never consumes capacity', (status) => {
      expect(orderConsumesCapacity({ status })).toBe(false);
      expect(orderConsumesCapacity({ status, inventoryReturnedToPool: false })).toBe(false);
      expect(orderConsumesCapacity({ status, inventoryReturnedToPool: true })).toBe(false);
    });

    it.each(['REFUNDED', 'CANCELLED'])('conditional status %s consumes capacity when inventoryReturnedToPool=false', (status) => {
      expect(orderConsumesCapacity({ status, inventoryReturnedToPool: false })).toBe(true);
    });

    it.each(['REFUNDED', 'CANCELLED'])('conditional status %s releases capacity when inventoryReturnedToPool=true', (status) => {
      expect(orderConsumesCapacity({ status, inventoryReturnedToPool: true })).toBe(false);
    });

    it.each(['REFUNDED', 'CANCELLED'])('conditional status %s consumes capacity when inventoryReturnedToPool is null/undefined (default)', (status) => {
      expect(orderConsumesCapacity({ status })).toBe(true);
      expect(orderConsumesCapacity({ status, inventoryReturnedToPool: null })).toBe(true);
      expect(orderConsumesCapacity({ status, inventoryReturnedToPool: undefined })).toBe(true);
    });

    it('unknown status does not consume capacity', () => {
      expect(orderConsumesCapacity({ status: 'BOGUS' })).toBe(false);
    });
  });

  describe('legacy helpers', () => {
    it('reservesCapacity returns true for always-reserved statuses only', () => {
      expect(reservesCapacity('PAID')).toBe(true);
      expect(reservesCapacity('REFUNDED')).toBe(false);
      expect(reservesCapacity('FAILED')).toBe(false);
    });

    it('releasesCapacity returns true for always-released statuses only', () => {
      expect(releasesCapacity('FAILED')).toBe(true);
      expect(releasesCapacity('EXPIRED')).toBe(true);
      expect(releasesCapacity('REFUNDED')).toBe(false);
      expect(releasesCapacity('PAID')).toBe(false);
    });
  });
});
