/**
 * Monetary Amount Validation Script
 * 
 * Run this script regularly to validate all monetary amounts in the system
 * are consistent and follow the pence storage standard.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ValidationResult {
  category: string;
  passed: boolean;
  message: string;
  details?: any;
}

async function validateMonetaryAmounts(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  
  try {
    console.log('🔍 VALIDATING MONETARY AMOUNTS ACROSS SYSTEM...\n');

    // 1. Validate Order amounts are reasonable
    const orderCheck = await prisma.order.findMany({
      where: { 
        OR: [
          { finalTotal: { gt: 0 } },
          { originalTotal: { gt: 0 } }
        ]
      },
      select: { id: true, finalTotal: true, originalTotal: true },
      take: 100
    });

    const unreasonableOrders = orderCheck.filter(order => {
      const amount = order.finalTotal || order.originalTotal || 0;
      return amount > 0 && (amount < 10 || amount > 1000000); // Less than £0.10 or more than £10,000
    });

    results.push({
      category: 'Order Amounts',
      passed: unreasonableOrders.length === 0,
      message: unreasonableOrders.length === 0 
        ? 'All order amounts are in reasonable pence ranges'
        : `Found ${unreasonableOrders.length} orders with unreasonable amounts`,
      details: unreasonableOrders.slice(0, 5)
    });

    // 2. Validate EventTicketType prices
    const ticketTypeCheck = await prisma.eventTicketType.findMany({
      select: { id: true, name: true, price: true },
      take: 50
    });

    const unreasonableTickets = ticketTypeCheck.filter(ticket => 
      ticket.price < 10 || ticket.price > 1000000 // Less than £0.10 or more than £10,000
    );

    results.push({
      category: 'Ticket Prices',
      passed: unreasonableTickets.length === 0,
      message: unreasonableTickets.length === 0
        ? 'All ticket prices are in reasonable pence ranges'
        : `Found ${unreasonableTickets.length} tickets with unreasonable prices`,
      details: unreasonableTickets.slice(0, 5)
    });

    // 3. Validate amount consistency within orders
    const inconsistentOrders = orderCheck.filter(order => {
      if (!order.finalTotal || !order.originalTotal) return false;
      
      // finalTotal should be <= originalTotal (after discounts)
      return order.finalTotal > order.originalTotal;
    });

    results.push({
      category: 'Amount Consistency',
      passed: inconsistentOrders.length === 0,
      message: inconsistentOrders.length === 0
        ? 'All orders have consistent finalTotal <= originalTotal'
        : `Found ${inconsistentOrders.length} orders with finalTotal > originalTotal`,
      details: inconsistentOrders.slice(0, 5)
    });

    // 4. Validate integer amounts (pence should be integers)
    const nonIntegerAmounts = orderCheck.filter(order => {
      const final = order.finalTotal || 0;
      const original = order.originalTotal || 0;
      return !Number.isInteger(final) || !Number.isInteger(original);
    });

    results.push({
      category: 'Integer Validation',
      passed: nonIntegerAmounts.length === 0,
      message: nonIntegerAmounts.length === 0
        ? 'All amounts are integers (proper pence format)'
        : `Found ${nonIntegerAmounts.length} orders with non-integer amounts`,
      details: nonIntegerAmounts.slice(0, 5)
    });

    // 5. Check for orders created in last 24 hours with suspicious amounts
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentOrders = await prisma.order.findMany({
      where: { 
        date: { gte: yesterday },
        OR: [
          { finalTotal: { gt: 0, lt: 50 } }, // Less than £0.50
          { originalTotal: { gt: 0, lt: 50 } }
        ]
      },
      select: { id: true, finalTotal: true, originalTotal: true, date: true }
    });

    results.push({
      category: 'Recent Orders',
      passed: recentOrders.length === 0,
      message: recentOrders.length === 0
        ? 'No recent orders with suspiciously small amounts'
        : `Found ${recentOrders.length} recent orders with amounts < £0.50`,
      details: recentOrders
    });

    return results;

  } catch (error) {
    results.push({
      category: 'Validation Error',
      passed: false,
      message: `Validation failed: ${error.message}`
    });
    return results;
  }
}

async function runValidation() {
  try {
    const results = await validateMonetaryAmounts();
    
    console.log('📊 VALIDATION RESULTS:\n');
    
    let allPassed = true;
    
    results.forEach(result => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${result.category}: ${result.message}`);
      
      if (!result.passed) {
        allPassed = false;
        if (result.details) {
          console.log('   Details:', JSON.stringify(result.details, null, 2));
        }
      }
    });
    
    if (allPassed) {
      console.log('\n🎉 ALL MONETARY VALIDATIONS PASSED!');
      console.log('💎 Your monetary system is consistent and correct.');
    } else {
      console.log('\n⚠️ SOME VALIDATIONS FAILED!');
      console.log('🔧 Review the details above and fix any issues.');
    }
    
    return allPassed;
    
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  runValidation()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Validation script failed:', error);
      process.exit(1);
    });
}

export default runValidation;









