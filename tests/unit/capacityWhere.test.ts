import {
  buildCapacityConsumingOrderWhere,
  capacityConsumingStatusFilter,
} from '../../src/lib/services/ticketing/capacityWhere';

describe('capacityWhere', () => {
  describe('buildCapacityConsumingOrderWhere', () => {
    it('includes eventDateId in the result', () => {
      const where = buildCapacityConsumingOrderWhere(42);
      expect(where.eventDateId).toBe(42);
    });

    it('has an OR clause with two branches', () => {
      const where = buildCapacityConsumingOrderWhere(1);
      expect(where.OR).toHaveLength(2);
    });

    it('first branch matches always-reserved statuses', () => {
      const where = buildCapacityConsumingOrderWhere(1);
      const branch = where.OR[0];
      expect(branch.status.in).toContain('CONFIRMED');
      expect(branch.status.in).toContain('PAID');
      expect(branch.status.in).toContain('PENDING');
      expect(branch.status.in).not.toContain('REFUNDED');
      expect(branch.status.in).not.toContain('CANCELLED');
    });

    it('second branch matches conditional statuses with inventoryReturnedToPool=false', () => {
      const where = buildCapacityConsumingOrderWhere(1);
      const branch = where.OR[1];
      expect(branch.status.in).toContain('REFUNDED');
      expect(branch.status.in).toContain('CANCELLED');
      expect(branch.inventoryReturnedToPool).toBe(false);
    });
  });

  describe('capacityConsumingStatusFilter', () => {
    it('returns the same OR structure without eventDateId', () => {
      const filter = capacityConsumingStatusFilter();
      expect(filter).toHaveLength(2);
      expect(filter[0].status.in).toContain('PAID');
      expect(filter[1].status.in).toContain('REFUNDED');
      expect(filter[1].inventoryReturnedToPool).toBe(false);
    });
  });
});
