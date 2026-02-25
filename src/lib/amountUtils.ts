/**
 * Utility functions for handling monetary amounts consistently
 * 
 * STANDARDIZED STATE (POST-MIGRATION):
 * - All order amounts: stored in pence (3000 = £30.00)
 * - All EventTicketType prices: stored in pence (3000 = £30.00)
 * - All displays: divide by 100 to show pounds
 * - All inputs: multiply by 100 to store pence
 * 
 * MIGRATION COMPLETE: All amounts now consistently stored in pence
 */

/**
 * All amounts are now stored in pence - no detection needed
 */
export function isAmountInPence(amount: number, orderId?: string): boolean {
  return true; // Post-migration: all amounts are in pence
}

/**
 * Convert any amount to pence (standardized storage format)
 * Post-migration: amounts are already in pence, just ensure integer
 */
export function toPence(amount: number, orderId?: string): number {
  return Math.round(amount); // Already in pence, ensure integer
}

/**
 * Convert pence to pounds for display
 * Post-migration: all amounts are in pence, so always divide by 100
 */
export function toPounds(amount: number, orderId?: string): number {
  return amount / 100; // All amounts are now in pence
}

/**
 * Format amount as currency string for display
 */
export function formatAmount(amount: number, orderId?: string, currency: string = 'GBP'): string {
  const pounds = toPounds(amount, orderId);
  return `£${pounds.toFixed(2)}`;
}

/**
 * Safely get order total in pounds for display
 */
export function getOrderTotalInPounds(order: any): number {
  const total = order.finalTotal || order.originalTotal || 0;
  return toPounds(total, order.id);
}

/**
 * EventTicketType prices are always stored in pence
 */
export function getTicketPriceInPounds(price: number): number {
  return price / 100;
}

/**
 * Format EventTicketType price for display
 */
export function formatTicketPrice(price: number, currency: string = 'GBP'): string {
  return `£${getTicketPriceInPounds(price).toFixed(2)}`;
}

/**
 * Utility functions for safe Stripe metadata handling
 */

/**
 * Convert amount in pence to safe string for Stripe metadata
 */
export function toPenceString(amountInPence: number): string {
  return Math.round(amountInPence).toString();
}

/**
 * Safely parse amount from Stripe metadata
 * Handles both new format (pence strings) and legacy format (pound strings)
 */
export function parseAmountFromMetadata(value: string): number {
  if (!value) return 0;
  
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return 0;
  
  // If the string contains a decimal point, it's likely pounds from old format
  if (value.includes('.')) {
    return Math.round(numValue * 100); // Convert pounds to pence
  }
  
  // Otherwise, treat as pence
  return Math.round(numValue);
}

/**
 * Validate that an amount is a reasonable pence value
 */
export function validatePenceAmount(amount: number, context: string = ''): boolean {
  if (!Number.isInteger(amount)) {
    console.warn(`[AMOUNT_VALIDATION] Non-integer amount detected: ${amount} in ${context}`);
    return false;
  }
  
  if (amount < 0) {
    console.warn(`[AMOUNT_VALIDATION] Negative amount detected: ${amount} in ${context}`);
    return false;
  }
  
  if (amount > 10000000) { // £100,000 limit
    console.warn(`[AMOUNT_VALIDATION] Suspiciously large amount: ${amount} pence (£${(amount/100).toFixed(2)}) in ${context}`);
    return false;
  }
  
  return true;
}
