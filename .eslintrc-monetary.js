/**
 * ESLint Rules for Monetary Amount Consistency
 * 
 * These rules help prevent monetary amount bugs by catching
 * dangerous patterns during development.
 */

module.exports = {
  rules: {
    // Warn about potential amount conversion issues
    'no-restricted-syntax': [
      'warn',
      {
        selector: 'BinaryExpression[operator="/"][right.type="Literal"][right.value=100]',
        message: 'MONETARY: Division by 100 detected. Verify amounts are in pence before converting to pounds. Use formatAmount() from amountUtils.ts for display.'
      },
      {
        selector: 'BinaryExpression[operator="*"][right.type="Literal"][right.value=100]',
        message: 'MONETARY: Multiplication by 100 detected. Verify this pence conversion is correct. Use toPence() from amountUtils.ts.'
      }
    ],
    
    // Warn about direct amount assignments
    'no-restricted-properties': [
      'warn',
      {
        object: '*',
        property: 'finalTotal',
        message: 'MONETARY: Direct finalTotal assignment. Ensure amount is in pence. Consider using amountUtils.ts functions.'
      },
      {
        object: '*', 
        property: 'originalTotal',
        message: 'MONETARY: Direct originalTotal assignment. Ensure amount is in pence. Consider using amountUtils.ts functions.'
      }
    ]
  }
};









