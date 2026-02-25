-- Phase 3.1: Drop deprecated EventTicketType.sold column
-- 
-- The sold column is no longer used. Availability is now computed dynamically
-- from Ticket rows via the availability service (computeAvailability).
--
-- Prerequisites verified:
-- - No code reads EventTicketType.sold from Prisma
-- - No code writes to EventTicketType.sold
-- - All availability calculations use ticket counts

ALTER TABLE "EventTicketType" DROP COLUMN "sold";
