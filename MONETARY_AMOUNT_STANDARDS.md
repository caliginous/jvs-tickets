# Monetary Amount Standards & Prevention Guide

## 🎯 **CRITICAL RULE: ALL AMOUNTS STORED IN PENCE**

After the September 2025 amount standardization, **ALL** monetary amounts in the system MUST be stored in pence (minor currency units).

## 📊 **Storage Standards**

| Data Type | Storage Format | Example | Display |
|-----------|---------------|---------|---------|
| Order amounts | Pence (integer) | `2500` | £25.00 |
| Ticket prices | Pence (integer) | `1500` | £15.00 |
| Refund amounts | Pence (integer) | `500` | £5.00 |
| Discount amounts | Pence (integer) | `250` | £2.50 |

## 🛠️ **Required Utilities**

**ALWAYS use these functions from `src/lib/amountUtils.ts`:**

```typescript
import { formatAmount, formatTicketPrice, getOrderTotalInPounds, toPence } from '../lib/amountUtils';

// ✅ CORRECT - Display amounts
const displayAmount = formatAmount(order.finalTotal, order.id);
const ticketDisplay = formatTicketPrice(ticketType.price);

// ✅ CORRECT - Get amounts for calculations
const totalInPounds = getOrderTotalInPounds(order);
const amountInPence = toPence(userInputAmount * 100);

// ❌ WRONG - Manual conversion
const amount = order.finalTotal / 100; // DON'T DO THIS
const penceAmount = userInput * 100;   // DON'T DO THIS
```

## 🚨 **HOW THE BUG HAPPENED**

### Root Causes Identified:
1. **Incomplete Migration Scope** - Fixed existing data but not creation logic
2. **Multiple Conversion Points** - 31+ places handle amount conversions
3. **Mixed Patterns** - Some `/100` were correct (display), others wrong (storage)
4. **Complex Data Flow** - Checkout → Stripe → Webhook → Database → Display
5. **Insufficient Testing** - No end-to-end amount validation

### Specific Bug Locations:
- `checkout/create-session.ts`: Divided by 100 during storage ❌
- `lib/stripe.ts`: Used `toFixed(2)` in metadata causing pounds→pence confusion ❌
- `webhook/stripe.ts`: Parsed pounds metadata as pence ❌
- `orderService.ts`: Converted amounts to pounds instead of keeping pence ❌

## 🛡️ **Prevention Strategies**

### 1. **Automated Validation**
```bash
# Run before every deployment
npm run validate:amounts

# Run in CI/CD pipeline
npm test && npm run validate:amounts && npm run build
```

### 2. **Development Checks**
```bash
# Check for dangerous patterns
grep -r "/ 100" src/ --include="*.ts" --include="*.tsx"
grep -r "\* 100" src/ --include="*.ts" --include="*.tsx"
grep -r "toFixed(2)" src/ --include="*.ts" --include="*.tsx"
```

### 3. **Code Review Checklist**

**For ANY change involving monetary amounts:**

- [ ] Are amounts stored in pence? 
- [ ] Does display logic use `formatAmount()` or `formatTicketPrice()`?
- [ ] Are Stripe amounts sent in pence (no conversion)?
- [ ] Do email templates format amounts correctly?
- [ ] Are user inputs converted to pence before storage?
- [ ] Does the change pass `npm run validate:amounts`?

### 4. **Testing Requirements**

**Every monetary amount change MUST include:**

- [ ] Unit test for the specific function
- [ ] Integration test for the full flow
- [ ] Database validation test
- [ ] Stripe simulation test
- [ ] Email template test

## 🔧 **Common Patterns**

### ✅ **CORRECT Patterns**

```typescript
// Display amounts
const displayTotal = formatAmount(order.finalTotal, order.id);
const ticketPrice = formatTicketPrice(ticketType.price);

// Store amounts (ensure pence)
const orderData = {
  finalTotal: Math.round(userInputPounds * 100), // Convert pounds to pence
  originalTotal: totalAmountInPence // Already in pence
};

// Stripe integration  
stripe.checkout.sessions.create({
  line_items: [{
    price_data: {
      unit_amount: ticketType.price, // Already in pence
    }
  }]
});

// Email templates
amount: `£${(data.refundAmount / 100).toFixed(2)}` // Convert pence to pounds for display
```

### ❌ **INCORRECT Patterns**

```typescript
// DON'T divide during storage
finalTotal: totalAmount / 100, // WRONG - stores wrong amount

// DON'T use toFixed for storage metadata
finalTotal: amount.toFixed(2), // WRONG - creates pounds string parsed as pence

// DON'T manually convert in components
const amount = order.finalTotal / 100; // WRONG - use formatAmount() instead

// DON'T multiply Stripe amounts
amount: Math.round(amount * 100), // WRONG if amount already in pence
```

## 📋 **Regular Maintenance**

### Daily (During Development)
- Run `npm run validate:amounts` before committing
- Check ESLint warnings for amount-related issues

### Weekly
- Review all recent amount-related changes
- Run comprehensive amount tests
- Check for new conversion patterns

### Monthly  
- Full codebase scan for amount handling
- Update this documentation
- Review and improve validation scripts

### Before Major Releases
- Run full test suite including amount tests
- Manual verification of key amount flows
- Stripe integration tests

## 🔍 **Debugging Amount Issues**

When investigating amount problems:

1. **Check the data source:**
   ```typescript
   console.log('Order amounts:', { 
     finalTotal: order.finalTotal, 
     originalTotal: order.originalTotal,
     id: order.id 
   });
   ```

2. **Trace the conversion path:**
   ```typescript
   console.log('Amount flow:', {
     database: order.finalTotal, // Should be pence
     display: formatAmount(order.finalTotal, order.id), // Should be £X.XX
     forStripe: order.finalTotal // Should be pence (no conversion)
   });
   ```

3. **Validate against Stripe:**
   - Check Stripe dashboard for actual amounts
   - Compare with database values
   - Verify refund amounts match expectations

## 🎯 **Success Metrics**

The system is working correctly when:

- ✅ All database amounts are integers (pence)
- ✅ All displays show correct pound values
- ✅ All Stripe amounts match database amounts
- ✅ All refunds process correct amounts
- ✅ All emails show correct amounts
- ✅ `npm run validate:amounts` passes
- ✅ No manual amount conversions in components

## 🚨 **Red Flags**

Watch out for these danger signs:

- 🚩 Amounts displaying as £0.05 instead of £5.00
- 🚩 Refunds processing wrong amounts  
- 🚩 New code with `/ 100` or `* 100`
- 🚩 Direct amount assignments without utilities
- 🚩 parseFloat() with amount metadata
- 🚩 toFixed(2) used in storage logic
- 🚩 Non-integer amounts in database
- 🚩 Amount validation script failures

---

**Remember: Monetary bugs can cost real money. When in doubt, validate twice!** 💰









