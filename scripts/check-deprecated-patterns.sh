#!/bin/bash
# Check for deprecated patterns that should not be in the codebase
# Run this in CI to prevent regression

set -e

ERRORS=0

echo "Checking for deprecated patterns..."

# Check for seatselection routes
if rg -q "seatselection" src/ 2>/dev/null; then
    echo "❌ ERROR: Found 'seatselection' reference (deprecated)"
    rg "seatselection" src/ --files-with-matches
    ERRORS=$((ERRORS + 1))
fi

# Check for SeatMap model references (excluding comments)
if rg -q "SeatMap|SeatReservation" src/ --type ts 2>/dev/null | grep -v "// "; then
    echo "❌ ERROR: Found SeatMap/SeatReservation reference (deprecated)"
    rg "SeatMap|SeatReservation" src/ --type ts --files-with-matches
    ERRORS=$((ERRORS + 1))
fi

# Check for categoryId in ticketing context (excluding comments and types)
if rg -q "categoryId" src/ --type ts 2>/dev/null | grep -v "//" | grep -v "interface" | grep -v "type "; then
    echo "⚠️ WARNING: Found 'categoryId' reference - review if this is intentional"
    rg "categoryId" src/ --type ts -l 2>/dev/null || true
fi

# Check for EventTicketType.sold writes (the column is deprecated)
# Allow reads for backwards compatibility during transition, but no writes
# Exclude comments (lines with //)
SOLD_WRITES=$(rg "sold.*increment|increment.*sold|sold:.*\{.*decrement|data:.*sold.*increment" src/ --type ts 2>/dev/null | grep -v "//" || true)
if [ -n "$SOLD_WRITES" ]; then
    echo "❌ ERROR: Found EventTicketType.sold write operations (deprecated)"
    echo "$SOLD_WRITES"
    ERRORS=$((ERRORS + 1))
fi

# Check for select: { ... sold: true } in Prisma queries (reading the deprecated column)
# This is a soft warning - we still support reading for backwards compat
SOLD_SELECTS=$(rg "select:.*sold: true" src/ --type ts 2>/dev/null || true)
if [ -n "$SOLD_SELECTS" ]; then
    echo "⚠️ WARNING: Found select: { sold: true } - should use computed sold from Ticket rows"
    echo "$SOLD_SELECTS"
fi

echo ""
if [ $ERRORS -gt 0 ]; then
    echo "❌ Found $ERRORS deprecated pattern(s). Please fix before merging."
    exit 1
else
    echo "✅ No deprecated patterns found."
    exit 0
fi
