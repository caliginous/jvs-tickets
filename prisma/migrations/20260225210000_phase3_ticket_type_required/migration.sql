-- Phase 3.2: Make Ticket.eventTicketTypeId required (NOT NULL)
--
-- Every ticket must now be associated with an EventTicketType.
-- The old Category system is fully removed.
--
-- Prerequisites verified:
-- - SELECT COUNT(*) FROM "Ticket" WHERE "eventTicketTypeId" IS NULL = 0
-- - All ticket creation paths set eventTicketTypeId
-- - Guards in place to prevent null values

ALTER TABLE "Ticket" ALTER COLUMN "eventTicketTypeId" SET NOT NULL;
