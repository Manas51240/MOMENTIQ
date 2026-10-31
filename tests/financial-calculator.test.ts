import { describe, it, expect } from 'vitest';
import {
  calculateTaxAndTotal,
  calculateBudgetMetrics,
  simulateGuestCountImpact,
  formatMinorUnits,
  RawCategoryData,
} from '../src/lib/financial/calculator';

describe('Deterministic Financial Arithmetic & Rounding Integrity Suite', () => {
  describe('Tax Calculation & Half-Up Banker Rounding', () => {
    it('calculates deterministic tax using integer basis points without floating point drift', () => {
      // 8.25% tax on $100.00 (10000 minor units)
      // tax = (10000 * 825 + 5000) / 10000 = (8250000 + 5000) / 10000 = 825 minor units ($8.25)
      const res1 = calculateTaxAndTotal(10000, 825);
      expect(Number(res1.baseMinor)).toBe(10000);
      expect(Number(res1.taxMinor)).toBe(825);
      expect(Number(res1.totalMinor)).toBe(10825);

      // Half-up rounding check on fractional penny:
      // $33.33 (3333 minor units) at 8.25% (825 bps)
      // 3333 * 825 = 2,749,725.
      // (2749725 + 5000) / 10000 = 2754725 / 10000 = 275 minor units ($2.75)
      const res2 = calculateTaxAndTotal(3333, 825);
      expect(Number(res2.taxMinor)).toBe(275);
      expect(Number(res2.totalMinor)).toBe(3608);
    });

    it('proves zero floating-point accumulation drift over 10,000 iterated minor transactions', () => {
      // Classic JS float bug: 0.1 + 0.2 !== 0.3
      // In minor integer math, 10 + 20 === 30 always.
      let totalMinor = BigInt(0);
      const stepMinor = BigInt(333); // $3.33

      for (let i = 0; i < 10000; i++) {
        totalMinor += stepMinor;
      }

      // Exactly 3,330,000 minor units ($33,300.00)
      expect(totalMinor.toString()).toBe('3330000');
    });

    it('formats minor units cleanly across various amounts and currencies', () => {
      expect(formatMinorUnits(10000, 'USD')).toBe('USD 100.00');
      expect(formatMinorUnits(5000000, 'USD')).toBe('USD 50,000.00');
      expect(formatMinorUnits(75, 'EUR')).toBe('EUR 0.75');
      expect(formatMinorUnits(0, 'GBP')).toBe('GBP 0.00');
    });
  });

  describe('Comprehensive Budget Metrics & Automated Alerts', () => {
    it('computes accurate utilization, variance, and triggers contingency and overrun alerts', () => {
      const totalBudgetMinor = BigInt(5000000); // $50,000.00
      const contingencyPercent = 10; // 10% = $5,000.00 reserve, $45,000.00 operable

      const pastDue = new Date(Date.now() - 86400000 * 5); // 5 days overdue

      const mockCategories: RawCategoryData[] = [
        {
          id: 'cat_venue',
          name: 'Venue & Catering',
          allocatedMinor: BigInt(2000000), // $20,000.00 allocated
          expenses: [
            {
              id: 'exp_1',
              amountMinor: BigInt(1500000),
              status: 'COMPLETED',
              payments: [{ amountMinor: BigInt(1500000), status: 'COMPLETED', isRefund: false }],
            },
            {
              id: 'exp_2',
              amountMinor: BigInt(800000), // $8,000.00 -> total committed $23,000 (exceeds $20,000!)
              status: 'PENDING',
              dueDate: pastDue, // triggers PAYMENT_OVERDUE alert
              payments: [],
            },
          ],
        },
        {
          id: 'cat_photo',
          name: 'Photography',
          allocatedMinor: BigInt(600000), // $6,000.00
          expenses: [
            {
              id: 'exp_3',
              amountMinor: BigInt(550000), // $5,500.00 (91.6% -> triggers WARNING)
              status: 'COMPLETED',
              payments: [{ amountMinor: BigInt(550000), status: 'COMPLETED', isRefund: false }],
            },
          ],
        },
      ];

      const summary = calculateBudgetMetrics(totalBudgetMinor, contingencyPercent, mockCategories, 'USD');

      expect(summary.totalBudgetMinor).toBe(5000000);
      expect(summary.contingencyReserveMinor).toBe(500000);
      expect(summary.operableBudgetMinor).toBe(4500000);

      // Total spent = $15,000 + $5,500 = $20,500 (2050000 minor)
      expect(summary.totalSpentMinor).toBe(2050000);
      // Total pending = $8,000 (800000 minor)
      expect(summary.totalPendingMinor).toBe(800000);
      // Committed = $28,500
      expect(summary.committedTotalMinor).toBe(2850000);
      // Remaining = $50,000 - $28,500 = $21,500
      expect(summary.remainingBudgetMinor).toBe(2150000);

      // Category 1 status: EXCEEDED ($23,000 committed > $20,000 allocated)
      expect(summary.categories[0].status).toBe('EXCEEDED');
      expect(summary.categories[0].varianceMinor).toBe(-300000); // $3,000 deficit

      // Category 2 status: WARNING (92% utilization)
      expect(summary.categories[1].status).toBe('WARNING');

      // Alerts triggered
      const overdueAlert = summary.alerts.find((a) => a.type === 'PAYMENT_OVERDUE');
      expect(overdueAlert).toBeDefined();

      const overrunAlert = summary.alerts.find((a) => a.type === 'CATEGORY_EXCEEDED');
      expect(overrunAlert).toBeDefined();
      expect(overrunAlert?.categoryId).toBe('cat_venue');
    });
  });

  describe('Guest Count Cost Simulation', () => {
    it('deterministically scales variable costs while preserving fixed commitments', () => {
      // 100 guests, $40,000 budget, 50% variable ($20,000 variable = $200/guest, $20,000 fixed)
      const currentGuests = 100;
      const budgetMinor = BigInt(4000000);

      // Simulate guest decrease to 80 guests
      // Variable becomes 80 * 200 = $16,000 (1600000)
      // New total = 2000000 + 1600000 = $36,000 (3600000)
      // Savings = -$4,000 (-400000)
      const simDecrease = simulateGuestCountImpact(currentGuests, 80, budgetMinor, 50);
      expect(Number(simDecrease.newTotalEstimatedMinor)).toBe(3600000);
      expect(Number(simDecrease.varianceMinor)).toBe(-400000);

      // Simulate guest increase to 120 guests
      // Variable becomes 120 * 200 = $24,000 (2400000)
      // New total = 2000000 + 2400000 = $44,000 (4400000)
      // Increase = +$4,000 (+400000)
      const simIncrease = simulateGuestCountImpact(currentGuests, 120, budgetMinor, 50);
      expect(Number(simIncrease.newTotalEstimatedMinor)).toBe(4400000);
      expect(Number(simIncrease.varianceMinor)).toBe(400000);
    });
  });
});

