-- Remove Category system (Phase 2 of deprecation plan)
-- All data has been migrated to EventTicketType system
-- Verified: 0 tickets depend solely on categoryId, 0 discount codes use categories

-- Drop CategoriesOnEvents junction table
DROP TABLE IF EXISTS "CategoriesOnEvents";

-- Drop Ticket.categoryId foreign key and column
ALTER TABLE "Ticket" DROP CONSTRAINT IF EXISTS "Ticket_categoryId_fkey";
DROP INDEX IF EXISTS "Ticket_categoryId_idx";
ALTER TABLE "Ticket" DROP COLUMN IF EXISTS "categoryId";

-- Drop Category table
DROP TABLE IF EXISTS "Category";

-- Drop DiscountCode.appliesToCategories column
ALTER TABLE "DiscountCode" DROP COLUMN IF EXISTS "appliesToCategories";
