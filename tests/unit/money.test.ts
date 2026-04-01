import { describe, it, expect } from 'vitest';
import { usdCentsToBsCents, formatRef, formatBs, totalFromItems } from '../../src/lib/money';

describe('Money Utilities', () => {
    it('usdCentsToBsCents should calculate correct rounded value', () => {
        // 10.50 USD (1050 cents) at rate 36.50
        const result = usdCentsToBsCents(1050, 36.50);
        expect(result).toBe(38325); // 383.25 Bs -> 38325 cents
    });

    it('formatRef should format USD correctly with comma', () => {
        expect(formatRef(310)).toBe('REF 3,10');
        expect(formatRef(1050)).toBe('REF 10,50');
    });

    it('formatBs should format Bs correctly with VET convention (comma for decimal, dot for thousands)', () => {
        const formatted = formatBs(139968);
        // VET locale formats 1399.68 as "1.399,68" or "1399,68" depending on Node version
        // So we test for presence of comma and the numbers
        expect(formatted).toContain('Bs. ');
        expect(formatted.replace(/\s/g, '').replace(/\./g, '')).toContain('1399,68');
    });

    it('totalFromItems should sum correctly', () => {
        const total = totalFromItems([
            { priceCents: 100, quantity: 2 },
            { priceCents: 50, quantity: 1 }
        ]);
        expect(total).toBe(250);
    });
});
