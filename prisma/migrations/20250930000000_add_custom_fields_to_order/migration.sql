-- AlterTable
-- Add customFields column to Order table to store custom field responses per order
-- This allows each order to have its own custom field data, rather than storing at user level

ALTER TABLE "public"."Order" ADD COLUMN "customFields" TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN "public"."Order"."customFields" IS 'JSON string of custom field responses for this specific order';

