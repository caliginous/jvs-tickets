-- Waitlist Data Model
--
-- Creates WaitlistEntry, WaitlistOffer, WaitlistAuditLog, and WaitlistClaimSession tables
-- with partial unique indexes for concurrency safety.

-- WaitlistEntry
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "eventDateId" INTEGER NOT NULL,
    "eventTicketTypeId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "requestedQuantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "source" TEXT,
    "notes" TEXT,
    "fulfillmentOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- WaitlistOffer
CREATE TABLE "WaitlistOffer" (
    "id" TEXT NOT NULL,
    "waitlistEntryId" TEXT NOT NULL,
    "eventDateId" INTEGER NOT NULL,
    "eventTicketTypeId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "offerToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "claimedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "sourceOrderId" TEXT,
    "notes" TEXT,

    CONSTRAINT "WaitlistOffer_pkey" PRIMARY KEY ("id")
);

-- WaitlistAuditLog (no cascading FKs – audit data survives deletion)
CREATE TABLE "WaitlistAuditLog" (
    "id" TEXT NOT NULL,
    "waitlistEntryId" TEXT,
    "waitlistOfferId" TEXT,
    "eventDateId" INTEGER,
    "eventTicketTypeId" INTEGER,
    "action" TEXT NOT NULL,
    "actor" TEXT,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaitlistAuditLog_pkey" PRIMARY KEY ("id")
);

-- WaitlistClaimSession
CREATE TABLE "WaitlistClaimSession" (
    "id" TEXT NOT NULL,
    "waitlistOfferId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaitlistClaimSession_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "WaitlistOffer_offerToken_key" ON "WaitlistOffer"("offerToken");
CREATE UNIQUE INDEX "WaitlistClaimSession_token_key" ON "WaitlistClaimSession"("token");

-- Operational indexes
CREATE INDEX "WaitlistEntry_eventDateId_eventTicketTypeId_status_createdAt_idx"
    ON "WaitlistEntry"("eventDateId", "eventTicketTypeId", "status", "createdAt");
CREATE INDEX "WaitlistEntry_email_idx" ON "WaitlistEntry"("email");
CREATE INDEX "WaitlistEntry_fulfillmentOrderId_idx" ON "WaitlistEntry"("fulfillmentOrderId");

CREATE INDEX "WaitlistOffer_eventDateId_eventTicketTypeId_status_expiresAt_idx"
    ON "WaitlistOffer"("eventDateId", "eventTicketTypeId", "status", "expiresAt");
CREATE INDEX "WaitlistOffer_offerToken_idx" ON "WaitlistOffer"("offerToken");

CREATE INDEX "WaitlistAuditLog_waitlistEntryId_idx" ON "WaitlistAuditLog"("waitlistEntryId");
CREATE INDEX "WaitlistAuditLog_waitlistOfferId_idx" ON "WaitlistAuditLog"("waitlistOfferId");
CREATE INDEX "WaitlistAuditLog_eventDateId_eventTicketTypeId_createdAt_idx"
    ON "WaitlistAuditLog"("eventDateId", "eventTicketTypeId", "createdAt");

CREATE INDEX "WaitlistClaimSession_waitlistOfferId_idx" ON "WaitlistClaimSession"("waitlistOfferId");

-- Foreign keys
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_eventDateId_fkey"
    FOREIGN KEY ("eventDateId") REFERENCES "EventDate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_eventTicketTypeId_fkey"
    FOREIGN KEY ("eventTicketTypeId") REFERENCES "EventTicketType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WaitlistOffer" ADD CONSTRAINT "WaitlistOffer_waitlistEntryId_fkey"
    FOREIGN KEY ("waitlistEntryId") REFERENCES "WaitlistEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WaitlistOffer" ADD CONSTRAINT "WaitlistOffer_eventDateId_fkey"
    FOREIGN KEY ("eventDateId") REFERENCES "EventDate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WaitlistOffer" ADD CONSTRAINT "WaitlistOffer_eventTicketTypeId_fkey"
    FOREIGN KEY ("eventTicketTypeId") REFERENCES "EventTicketType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Partial unique index: same email cannot hold two active-like entries
-- for the same event date and ticket type
CREATE UNIQUE INDEX "waitlist_entry_active_unique"
    ON "WaitlistEntry" ("email", "eventDateId", "eventTicketTypeId")
    WHERE "status" IN ('ACTIVE', 'OFFERED');

-- Partial unique index: only one active offer per waitlist entry
CREATE UNIQUE INDEX "waitlist_offer_one_active_per_entry"
    ON "WaitlistOffer" ("waitlistEntryId")
    WHERE "status" = 'ACTIVE';
