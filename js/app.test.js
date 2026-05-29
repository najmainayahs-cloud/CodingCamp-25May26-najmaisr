/**
 * @vitest-environment jsdom
 *
 * Property-Based Tests for the Expense & Budget Visualizer
 * Feature: expense-budget-visualizer
 *
 * Task 2.2 — Property 1: Transaction persistence round-trip
 * Validates: Requirements 1.2, 7.1, 7.3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Import the Storage module via the Node.js export guard at the bottom of app.js
const { Storage } = require('./app.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Arbitrary that generates valid transaction objects */
const validTransactionArb = fc.record({
  name:      fc.string({ minLength: 1, maxLength: 100 }),
  amount:    fc.float({ min: 0.01, max: 999999999.99, noNaN: true }),
  category:  fc.constantFrom('Food', 'Transport', 'Fun'),
  id:        fc.uuid(),
  timestamp: fc.integer({ min: 0 })
});

// ---------------------------------------------------------------------------
// Property 1: Transaction persistence round-trip
// Validates: Requirements 1.2, 7.1, 7.3
// Tag: Feature: expense-budget-visualizer, Property 1: transaction persistence round-trip
// ---------------------------------------------------------------------------

describe('Property 1: Transaction persistence round-trip', () => {
  const TEST_KEY = 'ebv_test_roundtrip';

  beforeEach(() => {
    // Clear the specific test key before each property run
    localStorage.removeItem(TEST_KEY);
  });

  it('Storage.save then Storage.load returns identical data for any valid transaction', () => {
    fc.assert(
      fc.property(validTransactionArb, (transaction) => {
        // Save the transaction
        const saveResult = Storage.save(TEST_KEY, transaction);
        expect(saveResult.ok).toBe(true);

        // Load it back
        const loadResult = Storage.load(TEST_KEY);
        expect(loadResult.ok).toBe(true);
        expect(loadResult.data).toEqual(transaction);

        // Cleanup for next iteration
        localStorage.removeItem(TEST_KEY);
      }),
      { numRuns: 100 }
    );
  });

  it('Storage.save then Storage.load returns identical data for any valid transaction array', () => {
    fc.assert(
      fc.property(fc.array(validTransactionArb, { minLength: 0, maxLength: 20 }), (transactions) => {
        const saveResult = Storage.save(TEST_KEY, transactions);
        expect(saveResult.ok).toBe(true);

        const loadResult = Storage.load(TEST_KEY);
        expect(loadResult.ok).toBe(true);
        expect(loadResult.data).toEqual(transactions);

        // Cleanup for next iteration
        localStorage.removeItem(TEST_KEY);
      }),
      { numRuns: 100 }
    );
  });

  it('Storage.load returns { ok: false } when localStorage contains corrupted JSON', () => {
    fc.assert(
      fc.property(validTransactionArb, (transaction) => {
        // Directly write corrupted JSON to localStorage (bypassing Storage.save)
        localStorage.setItem(TEST_KEY, 'not-valid-json');

        const loadResult = Storage.load(TEST_KEY);
        expect(loadResult.ok).toBe(false);

        // Cleanup for next iteration
        localStorage.removeItem(TEST_KEY);
      }),
      { numRuns: 100 }
    );
  });
});
