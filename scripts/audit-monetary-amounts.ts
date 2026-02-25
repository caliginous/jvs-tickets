/**
 * Comprehensive Monetary Amount Audit Tool
 * 
 * This script scans the entire codebase to find all places where monetary amounts
 * are handled and validates they follow the standardized pence storage format.
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface AmountIssue {
  file: string;
  line: number;
  code: string;
  issue: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'CONVERSION' | 'STORAGE' | 'DISPLAY' | 'API';
}

class MonetaryAmountAuditor {
  private issues: AmountIssue[] = [];
  private sourceDir = './src';
  
  // Patterns that indicate potential amount handling issues
  private patterns = [
    // Division by 100 - could be wrong if amounts are already in pence
    { 
      regex: /\/\s*100(?!\.\d)/g, 
      issue: 'Division by 100 - verify amounts are in pence before converting',
      severity: 'HIGH' as const,
      category: 'CONVERSION' as const
    },
    
    // Multiplication by 100 - could be wrong if amounts should stay in pence
    {
      regex: /\*\s*100(?!\.\d)/g,
      issue: 'Multiplication by 100 - verify this is correct pence conversion',
      severity: 'HIGH' as const,
      category: 'CONVERSION' as const
    },
    
    // toFixed(2) with totals - might be converting pence to pounds incorrectly
    {
      regex: /(finalTotal|originalTotal|total|amount|price).*\.toFixed\(2\)/g,
      issue: 'toFixed(2) with amount - ensure this is display formatting not storage',
      severity: 'MEDIUM' as const,
      category: 'DISPLAY' as const
    },
    
    // parseFloat with totals - might be parsing pounds as pence
    {
      regex: /parseFloat\([^)]*(?:total|amount|price)/gi,
      issue: 'parseFloat with amount - verify units are consistent',
      severity: 'HIGH' as const,
      category: 'STORAGE' as const
    },
    
    // Direct assignment of amounts without validation
    {
      regex: /(finalTotal|originalTotal):\s*[a-zA-Z]/g,
      issue: 'Direct amount assignment - verify units and validation',
      severity: 'MEDIUM' as const,
      category: 'STORAGE' as const
    },
    
    // Stripe amount handling
    {
      regex: /unit_amount.*\*|amount.*\*/g,
      issue: 'Stripe amount calculation - verify pence units',
      severity: 'HIGH' as const,
      category: 'API' as const
    }
  ];

  private excludePatterns = [
    /node_modules/,
    /\.next/,
    /\.git/,
    /\.vercel/,
    /dist/,
    /build/,
    /coverage/,
    /tests?\/.*\.test\./,
    /\.test\./,
    /\.spec\./
  ];

  async scanCodebase(): Promise<AmountIssue[]> {
    console.log('🔍 STARTING COMPREHENSIVE MONETARY AMOUNT AUDIT...\n');

    try {
      // Find all relevant files
      const files = await glob('**/*.{ts,tsx,js,jsx}', {
        cwd: this.sourceDir,
        absolute: false
      });

      console.log(`📁 Scanning ${files.length} files in ${this.sourceDir}...`);

      for (const file of files) {
        const fullPath = path.join(this.sourceDir, file);
        
        // Skip excluded files
        if (this.excludePatterns.some(pattern => pattern.test(fullPath))) {
          continue;
        }

        await this.scanFile(fullPath);
      }

      // Also scan API routes and other important files
      const additionalPaths = [
        './prisma/**/*.{ts,js}',
        './scripts/**/*.{ts,js}',
        './*.{ts,js}'
      ];

      for (const pattern of additionalPaths) {
        const additionalFiles = await glob(pattern, { absolute: false });
        for (const file of additionalFiles) {
          if (!this.excludePatterns.some(pattern => pattern.test(file))) {
            await this.scanFile(file);
          }
        }
      }

      return this.issues;
    } catch (error) {
      console.error('Error during audit:', error);
      return this.issues;
    }
  }

  private async scanFile(filePath: string): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        
        for (const pattern of this.patterns) {
          const matches = line.matchAll(pattern.regex);
          
          for (const match of matches) {
            // Skip if this looks like a comment
            if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
              continue;
            }

            this.issues.push({
              file: filePath,
              line: lineIndex + 1,
              code: line.trim(),
              issue: pattern.issue,
              severity: pattern.severity,
              category: pattern.category
            });
          }
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not scan ${filePath}:`, error.message);
    }
  }

  generateReport(): void {
    console.log(`\n📊 AUDIT RESULTS: Found ${this.issues.length} potential issues\n`);

    if (this.issues.length === 0) {
      console.log('✅ No monetary amount issues found!');
      return;
    }

    // Group by severity
    const groupedBySeverity = this.issues.reduce((acc, issue) => {
      if (!acc[issue.severity]) acc[issue.severity] = [];
      acc[issue.severity].push(issue);
      return acc;
    }, {} as Record<string, AmountIssue[]>);

    // Group by category
    const groupedByCategory = this.issues.reduce((acc, issue) => {
      if (!acc[issue.category]) acc[issue.category] = [];
      acc[issue.category].push(issue);
      return acc;
    }, {} as Record<string, AmountIssue[]>);

    // Report by severity
    for (const severity of ['HIGH', 'MEDIUM', 'LOW']) {
      const issues = groupedBySeverity[severity] || [];
      if (issues.length > 0) {
        console.log(`🚨 ${severity} PRIORITY (${issues.length} issues):`);
        issues.forEach(issue => {
          console.log(`   ${issue.file}:${issue.line}`);
          console.log(`      ${issue.code}`);
          console.log(`      ➜ ${issue.issue}`);
          console.log('');
        });
      }
    }

    // Summary by category
    console.log('📋 ISSUES BY CATEGORY:');
    for (const [category, issues] of Object.entries(groupedByCategory)) {
      console.log(`   ${category}: ${issues.length} issues`);
    }

    console.log('\n🔧 RECOMMENDED ACTIONS:');
    console.log('1. Review all HIGH priority issues immediately');
    console.log('2. Create unit tests for each amount conversion');
    console.log('3. Use amountUtils.ts for all conversions');
    console.log('4. Add ESLint rules to catch these patterns');
    console.log('5. Run this audit regularly during development');
  }

  async generateFixSuggestions(): Promise<void> {
    console.log('\n💡 AUTOMATED FIX SUGGESTIONS:\n');

    const highPriorityIssues = this.issues.filter(issue => issue.severity === 'HIGH');
    
    for (const issue of highPriorityIssues) {
      console.log(`📁 ${issue.file}:${issue.line}`);
      console.log(`   Current: ${issue.code}`);
      
      // Suggest fixes based on patterns
      if (issue.code.includes('/ 100') && issue.code.includes('finalTotal')) {
        console.log(`   Suggest: Use formatAmount(order.finalTotal, order.id) instead`);
      } else if (issue.code.includes('* 100') && issue.code.includes('price')) {
        console.log(`   Suggest: Verify if price is already in pence`);
      } else if (issue.code.includes('parseFloat') && issue.code.includes('total')) {
        console.log(`   Suggest: Ensure parsed value is in pence, use parseInt for pence amounts`);
      }
      
      console.log('');
    }
  }
}

async function runAudit() {
  const auditor = new MonetaryAmountAuditor();
  const issues = await auditor.scanCodebase();
  
  auditor.generateReport();
  await auditor.generateFixSuggestions();
  
  // Exit with error code if high priority issues found
  const highPriorityIssues = issues.filter(i => i.severity === 'HIGH');
  if (highPriorityIssues.length > 0) {
    console.log(`\n❌ Found ${highPriorityIssues.length} HIGH priority monetary amount issues!`);
    process.exit(1);
  } else {
    console.log('\n✅ No high priority monetary amount issues found!');
    process.exit(0);
  }
}

if (require.main === module) {
  runAudit().catch(console.error);
}

export default MonetaryAmountAuditor;









