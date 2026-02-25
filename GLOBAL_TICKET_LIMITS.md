# 🌐 Global Ticket Limits - Implementation Guide

## Overview

The Tessera system now supports **global ticket limits** that enforce a maximum number of tickets that can be sold across ALL categories combined, regardless of individual category limits.

## How It Works

### Before Global Limits
- **Adult**: 30 tickets max
- **Child**: 10 tickets max  
- **Supporter**: 10 tickets max
- **Total**: 50 tickets could potentially be sold

### With Global Limits
- **Adult**: 30 tickets max (but limited by global cap)
- **Child**: 10 tickets max (but limited by global cap)
- **Supporter**: 10 tickets max (but limited by global cap)
- **🌐 Global Limit**: 20 tickets total across all categories
- **Result**: Only 20 tickets can be sold, regardless of individual category availability

## Implementation Details

### Database Schema
```sql
-- Added to EventDate table
ALTER TABLE "EventDate" ADD COLUMN "totalTicketLimit" INTEGER;
```

### API Response Changes
The `/api/public/events` endpoint now includes:

```json
{
  "ticketAvailability": {
    "total": 20,           // Limited by global cap
    "available": 11,        // Available within global limit
    "sold": 9,             // Already sold
    "percentageRemaining": 55,
    "hasGlobalLimit": true  // NEW: indicates global limit is active
  }
}
```

### Order Validation
When creating orders, the system now checks:
1. Individual category availability
2. **Global ticket limit compliance**
3. Returns HTTP 412 if global limit would be exceeded

## Setting Global Limits

### Using the Utility Script
```bash
# Set global limit of 20 tickets for event date ID 4
node set-global-limit.js 4 20
```

### Manual Database Update
```sql
UPDATE "EventDate" 
SET "totalTicketLimit" = 20 
WHERE id = 4;
```

### Admin Interface (Future Enhancement)
- Add `totalTicketLimit` field to event management forms
- Real-time validation and preview of limits

## Real-World Example

### Current Event Status
```
📅 Event: Rosh Hashanah Seder and Dinner
🌐 Has global limit: TRUE
📊 Total capacity: 20 (was 50, now limited to 20)
🎫 Available: 11 tickets
💰 Sold: 9 tickets
📈 Percentage remaining: 55%

🏷️  Category breakdown:
   - Adult: 23 available (max: 30)     ← Limited by global cap
   - Child: 8 available (max: 10)      ← Limited by global cap  
   - Supporter: 10 available (max: 10) ← Limited by global cap
```

### What This Means
- **Individual categories** still show their original max amounts
- **API availability** respects the global limit of 20
- **Order creation** will fail if trying to exceed 20 total tickets
- **Real-time updates** show accurate availability within global constraints

## Benefits

### 1. **Prevent Overselling**
- No more selling 50 tickets when venue only holds 20 people
- Automatic enforcement at the API level

### 2. **Venue Compliance**
- Ensure physical space constraints are respected
- Fire safety and capacity regulations compliance

### 3. **Better Inventory Control**
- Centralized ticket management
- Real-time availability tracking

### 4. **Flexible Category Management**
- Categories can have high individual limits
- Global cap prevents total overselling
- Easy to adjust without changing category settings

## Use Cases

### Small Venue Events
```
🌐 Global Limit: 50 tickets
🏷️  Categories:
   - VIP: 20 tickets (premium)
   - General: 30 tickets (standard)
   - Student: 20 tickets (discounted)
   
Result: Only 50 total tickets sold, regardless of category popularity
```

### Conference Events
```
🌐 Global Limit: 200 attendees
🏷️  Categories:
   - Early Bird: 100 tickets
   - Regular: 100 tickets
   - VIP: 50 tickets
   
Result: Maximum 200 attendees, with category distribution flexibility
```

### Workshop Series
```
🌐 Global Limit: 15 participants per session
🏷️  Categories:
   - Member: 10 tickets
   - Non-Member: 10 tickets
   
Result: Intimate workshop size maintained across all categories
```

## API Integration Examples

### Check Global Limit Status
```javascript
const events = await fetch('/api/public/events').then(r => r.json());

events.forEach(event => {
  if (event.ticketAvailability.hasGlobalLimit) {
    console.log(`${event.title} has global limit: ${event.ticketAvailability.total}`);
  }
});
```

### Monitor Availability
```javascript
const event = events[0];
const { total, available, sold, hasGlobalLimit } = event.ticketAvailability;

if (hasGlobalLimit) {
  console.log(`🌐 Global limit: ${total} tickets`);
  console.log(`📊 Available: ${available}/${total}`);
  console.log(`⚠️  Warning: ${total - available - sold} tickets remaining`);
}
```

### Order Validation
```javascript
// Frontend should check global availability before submitting
const canOrder = (ticketCount) => {
  const { available } = event.ticketAvailability;
  return ticketCount <= available;
};
```

## Error Handling

### HTTP 412 - Global Limit Exceeded
```json
{
  "statusCode": 412,
  "message": "Order would exceed global ticket limit. Only 5 tickets remaining."
}
```

### Frontend Validation
```javascript
try {
  const response = await fetch('/api/order/store', {
    method: 'POST',
    body: JSON.stringify(orderData)
  });
  
  if (response.status === 412) {
    const error = await response.json();
    alert(`Cannot complete order: ${error.message}`);
  }
} catch (error) {
  console.error('Order failed:', error);
}
```

## Migration Guide

### For Existing Events
1. **No breaking changes** - existing events work without global limits
2. **Gradual adoption** - set limits only where needed
3. **Backward compatibility** - API responses include `hasGlobalLimit: false` for unlimited events

### For New Events
1. Set `totalTicketLimit` during event creation
2. Use admin interface to configure limits
3. Test with small limits before production

## Future Enhancements

### Planned Features
- **Admin Dashboard**: Visual global limit management
- **Real-time Updates**: WebSocket notifications for availability changes
- **Analytics**: Track global limit effectiveness
- **Bulk Operations**: Set limits across multiple events

### Advanced Scenarios
- **Time-based Limits**: Different limits for different time periods
- **Category Weighting**: Some categories count more toward global limit
- **Dynamic Limits**: Adjust limits based on demand or venue changes

## Troubleshooting

### Common Issues

#### 1. Global Limit Not Working
- Check if `totalTicketLimit` is set in database
- Verify Prisma schema includes the new field
- Ensure API endpoint is updated

#### 2. Orders Still Being Created
- Verify order validation is running
- Check if global limit check is in the right place
- Ensure proper error handling

#### 3. API Response Inconsistencies
- Clear browser cache
- Check if deployment is complete
- Verify database schema changes

### Debug Commands
```bash
# Check current global limit
node -e "const {PrismaClient} = require('@prisma/client'); const prisma = new PrismaClient(); prisma.eventDate.findUnique({where: {id: 4}}).then(console.log).finally(() => prisma.$disconnect())"

# Test API response
curl -s "https://tickets.jvs.org.uk/api/public/events" | jq '.[0].ticketAvailability'
```

## Conclusion

Global ticket limits provide a powerful way to manage event capacity while maintaining flexibility in category management. The system automatically enforces limits at the API level, preventing overselling and ensuring venue compliance.

### Key Takeaways
- ✅ **Easy to implement** - just set `totalTicketLimit` on event dates
- ✅ **No breaking changes** - existing events continue to work
- ✅ **Real-time enforcement** - limits applied at order creation
- ✅ **Flexible categories** - individual category limits still respected within global cap
- ✅ **API integration** - seamless integration with existing systems

For questions or support, refer to the API documentation or contact the development team.
