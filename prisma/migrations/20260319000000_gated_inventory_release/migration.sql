-- Gated Inventory Release
--
-- Adds inventory-release fields to Order so that refunded/cancelled orders
-- continue consuming capacity until an admin explicitly returns them to the pool.
--
-- IMPORTANT: This migration atomically adds the columns AND backfills
-- historical REFUNDED/CANCELLED orders to inventoryReturnedToPool = true,
-- so the application never sees a state where old refunded orders suddenly
-- consume capacity.

ALTER TABLE "Order" ADD COLUMN "inventoryReturnedToPool" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "inventoryReturnedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "inventoryReturnedBy" TEXT;

-- Backfill: historical REFUNDED and CANCELLED orders should be treated as
-- already returned to pool (preserving existing behaviour).
UPDATE "Order"
SET "inventoryReturnedToPool" = true
WHERE "status" IN ('REFUNDED', 'CANCELLED');

-- Index for filtering by inventory state
CREATE INDEX "Order_inventoryReturnedToPool_idx" ON "Order"("inventoryReturnedToPool");
