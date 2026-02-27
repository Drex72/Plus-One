/**
 * Negative & edge-case tests targeting boundary conditions,
 * malformed data, and unusual input combinations.
 */

jest.mock('@/core', () => ({
    logger: { debug: jest.fn(), warn: jest.fn(), info: jest.fn(), error: jest.fn() },
    BadRequestError: class BadRequestError extends Error {
        constructor(msg: string) {
            super(msg);
            this.name = 'BadRequestError';
        }
    },
}));

jest.mock('@/core/config', () => ({
    config: { matching: { threshold: 50, maxBatchSize: 1000 }, appEnvironment: 'development' },
}));

import { exactMatch, arraySimilarity, ordinalSimilarity, numericSimilarity, scoreAttribute } from '~/matching/engine/scorers';
import { calculateMatchScore } from '~/matching/engine/matcher';
import { satisfiesConstraint, checkHardConstraints } from '~/matching/engine/constraints';
import { normalizePreferences, normalizeProfile, toMatchableAttendee, chunk, pairKey } from '~/matching/engine/utils';
import { validateMatchingConfig, generateDefaultAttributes } from '~/matching/engine/validators';
import type { MatchableAttendee, MatchingConfig, ConstraintRule } from '~/matching/interfaces';

function makeAttendee(overrides: Partial<MatchableAttendee> = {}): MatchableAttendee {
    return {
        id: 'a1',
        eventId: 'e1',
        tenantId: 't1',
        name: 'Test',
        profile: {},
        preferences: [],
        enrichedProfile: null,
        status: 'pending',
        ...overrides,
    };
}

// ─── Scorer Edge Cases ──────────────────────────────────

describe('Scorer edge cases', () => {
    it('exactMatch: type coercion does NOT occur (1 !== "1")', () => {
        expect(exactMatch(1, '1')).toBe(0);
    });

    it('exactMatch: false vs 0 are not equal', () => {
        expect(exactMatch(false, 0)).toBe(0);
    });

    it('exactMatch: empty string vs null → 0', () => {
        expect(exactMatch('', null)).toBe(0);
    });

    it('arraySimilarity: handles very large arrays', () => {
        const bigA = Array.from({ length: 10000 }, (_, i) => `item-${i}`);
        const bigB = Array.from({ length: 10000 }, (_, i) => `item-${i + 5000}`);
        const result = arraySimilarity(bigA, bigB);
        expect(result).toBeGreaterThan(0);
        expect(result).toBeLessThan(1);
    });

    it('arraySimilarity: duplicate elements are deduplicated', () => {
        expect(arraySimilarity(['a', 'a', 'b'], ['a', 'b'])).toBe(1);
    });

    it('numericSimilarity: negative values work', () => {
        expect(numericSimilarity(-5, -10, 20)).toBeCloseTo(0.75);
    });

    it('numericSimilarity: very large numbers', () => {
        expect(numericSimilarity(1e15, 1e15 + 100, 1000)).toBeCloseTo(0.9);
    });

    it('numericSimilarity: NaN yields 0', () => {
        expect(numericSimilarity(NaN, 5, 10)).toBe(0);
    });

    it('numericSimilarity: Infinity yields 0', () => {
        expect(numericSimilarity(Infinity, 5, 10)).toBe(0);
    });

    it('ordinalSimilarity: identical values return 1', () => {
        expect(ordinalSimilarity(['a', 'b', 'c'], 'b', 'b')).toBe(1);
    });

    it('ordinalSimilarity: extreme ends of long scale', () => {
        const scale = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
        expect(ordinalSimilarity(scale, 'a', 'j')).toBeCloseTo(0);
    });

    it('scoreAttribute: unknown type falls back to exactMatch', () => {
        const { logger } = require('@/core');
        const result = scoreAttribute('x', 'x', { field: 'f', type: 'unknown_type' as any, weight: 1, config: {} });
        expect(result).toBe(1);
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Unknown attribute type'));
    });
});

// ─── Constraint Edge Cases ──────────────────────────────

describe('Constraint edge cases', () => {
    const a = makeAttendee({ profile: { x: 5 } });

    it('unknown operator returns true (permissive)', () => {
        const b = makeAttendee({ profile: { y: 10 } });
        const constraint: ConstraintRule = { field: 'y', operator: 'unknown_op' as any, value: 10, type: 'hard' };
        expect(satisfiesConstraint(a, b, constraint)).toBe(true);
    });

    it('range with reversed min/max yields false', () => {
        const b = makeAttendee({ profile: { age: 25 } });
        const constraint: ConstraintRule = { field: 'age', operator: 'range', value: [30, 20], type: 'hard' };
        expect(satisfiesConstraint(a, b, constraint)).toBe(false);
    });

    it('eq with object value does reference comparison', () => {
        const obj = { foo: 'bar' };
        const b = makeAttendee({ profile: { data: obj } });
        const constraint: ConstraintRule = { field: 'data', operator: 'eq', value: obj, type: 'hard' };
        expect(satisfiesConstraint(a, b, constraint)).toBe(true);
    });

    it('many hard constraints — all must pass', () => {
        const attendeeA = makeAttendee({ profile: { a: 1, b: 2, c: 3 } });
        const attendeeB = makeAttendee({ profile: { a: 1, b: 2, c: 3 } });
        const constraints: ConstraintRule[] = [
            { field: 'a', operator: 'eq', value: 1, type: 'hard' },
            { field: 'b', operator: 'eq', value: 2, type: 'hard' },
            { field: 'c', operator: 'eq', value: 3, type: 'hard' },
        ];
        expect(checkHardConstraints(attendeeA, attendeeB, constraints)).toBe(true);
    });

    it('fails on the first failing hard constraint (short-circuit)', () => {
        const attendeeA = makeAttendee({ profile: { a: 1, b: 999 } });
        const attendeeB = makeAttendee({ profile: { a: 1, b: 2 } });
        const constraints: ConstraintRule[] = [
            { field: 'a', operator: 'eq', value: 1, type: 'hard' },
            { field: 'b', operator: 'eq', value: 2, type: 'hard' },
        ];
        expect(checkHardConstraints(attendeeA, attendeeB, constraints)).toBe(false);
    });
});

// ─── calculateMatchScore Edge Cases ─────────────────────

describe('calculateMatchScore edge cases', () => {
    it('returns 0 when all attribute values are missing', () => {
        const config: MatchingConfig = {
            matchThreshold: 50,
            attributes: [{ field: 'missing', type: 'exact', weight: 1, config: {} }],
            constraints: [],
            requiredFields: [],
        };
        const a = makeAttendee();
        const b = makeAttendee({ id: 'b1' });
        const result = calculateMatchScore(a, b, config);
        expect(result.score).toBe(0);
    });

    it('handles a config with zero-weight attributes without dividing by zero', () => {
        const config: MatchingConfig = {
            matchThreshold: 50,
            attributes: [{ field: 'x', type: 'exact', weight: 0, config: {} }],
            constraints: [],
            requiredFields: [],
        };
        const a = makeAttendee({ profile: { x: 'same' } });
        const b = makeAttendee({ id: 'b1', profile: { x: 'same' } });
        const result = calculateMatchScore(a, b, config);
        expect(result.score).toBe(0);
    });

    it('multiple soft penalties can stack', () => {
        const config: MatchingConfig = {
            matchThreshold: 50,
            attributes: [{ field: 'x', type: 'exact', weight: 1, config: {} }],
            constraints: [
                { field: 'a', operator: 'eq', value: 'yes', type: 'soft' },
                { field: 'b', operator: 'eq', value: 'yes', type: 'soft' },
                { field: 'c', operator: 'eq', value: 'yes', type: 'soft' },
            ],
            requiredFields: [],
        };
        const a = makeAttendee({ profile: { x: 'same' } });
        const b = makeAttendee({ id: 'b1', profile: { x: 'same' } });
        const result = calculateMatchScore(a, b, config);
        // exact match = 100, minus 3×10 = 70
        expect(result.score).toBe(70);
    });
});

// ─── Utility Edge Cases ─────────────────────────────────

describe('Utility edge cases', () => {
    it('normalizePreferences: deeply nested invalid objects yield empty', () => {
        expect(normalizePreferences([{}, { a: 1 }])).toEqual([]);
    });

    it('normalizeProfile: function is not valid profile', () => {
        expect(normalizeProfile(() => {})).toEqual({});
    });

    it('toMatchableAttendee: handles missing fields', () => {
        const row = {
            id: undefined,
            event_id: undefined,
            tenant_id: undefined,
            name: undefined,
            attributes: null,
            preferences: null,
            status: undefined,
        };
        const result = toMatchableAttendee(row as any);
        expect(result.id).toBeUndefined();
        expect(result.profile).toEqual({});
        expect(result.preferences).toEqual([]);
    });

    it('chunk: size = 1 produces single-element arrays', () => {
        expect(chunk([1, 2], 1)).toEqual([[1], [2]]);
    });

    it('pairKey: handles empty strings', () => {
        expect(pairKey('', '')).toBe(':');
    });
});

// ─── Validator Edge Cases ───────────────────────────────

describe('Validator edge cases', () => {
    it('validateMatchingConfig: config with undefined attributes throws', () => {
        expect(() => validateMatchingConfig({ matchThreshold: 50 } as any)).toThrow();
    });

    it('generateDefaultAttributes: single field gets weight 1.0', () => {
        const attrs = generateDefaultAttributes(['city']);
        expect(attrs).toHaveLength(1);
        expect(attrs[0].weight).toBe(1.0);
    });

    it('generateDefaultAttributes: "goal" maps to array_similarity', () => {
        const attrs = generateDefaultAttributes(['goal']);
        expect(attrs[0].type).toBe('array_similarity');
    });

    it('generateDefaultAttributes: "seniority" maps to ordinal', () => {
        const attrs = generateDefaultAttributes(['seniority']);
        expect(attrs[0].type).toBe('ordinal');
    });

    it('generateDefaultAttributes: "distance" maps to numeric', () => {
        const attrs = generateDefaultAttributes(['distance']);
        expect(attrs[0].type).toBe('numeric');
    });
});
