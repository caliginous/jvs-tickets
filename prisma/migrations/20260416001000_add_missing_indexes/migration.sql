-- Add missing indexes identified by the April 2026 code review.

-- EventDate.eventId: filtered in most event queries; currently no index.
CREATE INDEX IF NOT EXISTS "EventDate_eventId_idx" ON "EventDate"("eventId");

-- CustomField.eventId: joined on every booking form render.
CREATE INDEX IF NOT EXISTS "CustomField_eventId_idx" ON "CustomField"("eventId");

-- Translation.(namespace, key): filtered in translation APIs.
CREATE INDEX IF NOT EXISTS "Translation_namespace_key_idx" ON "Translation"("namespace", "key");

-- Order.(status, date): used by cron cleanup to find expired PENDING orders.
CREATE INDEX IF NOT EXISTS "Order_status_date_idx" ON "Order"("status", "date");

-- Order.userId: used by user reports / admin lookups.
CREATE INDEX IF NOT EXISTS "Order_userId_idx" ON "Order"("userId");
