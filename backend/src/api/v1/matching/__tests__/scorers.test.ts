jest.mock('@/core', () => ({
    logger: { debug: jest.fn(), warn: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

import { exactMatch, arraySimilarity, ordinalSimilarity, numericSimilarity, scoreAttribute, scorerRegistry } from '~/matching/engine/scorers';

describe('exactMatch', () => {
    it('returns 1 for identical values', () => {
        expect(exactMatch('a', 'a')).toBe(1);
        expect(exactMatch(42, 42)).toBe(1);
        expect(exactMatch(true, true)).toBe(1);
    });

    it('returns 0 for different values', () => {
        expect(exactMatch('a', 'b')).toBe(0);
        expect(exactMatch(1, 2)).toBe(0);
        expect(exactMatch(true, false)).toBe(0);
    });

    it('returns 0 when either value is null/undefined', () => {
        expect(exactMatch(null, 'a')).toBe(0);
        expect(exactMatch('a', null)).toBe(0);
        expect(exactMatch(undefined, 'a')).toBe(0);
        expect(exactMatch(null, null)).toBe(0);
        expect(exactMatch(undefined, undefined)).toBe(0);
    });

    it('does not coerce types (strict equality)', () => {
        expect(exactMatch(1, '1')).toBe(0);
        expect(exactMatch(0, false)).toBe(0);
        expect(exactMatch('', false)).toBe(0);
    });
});

describe('arraySimilarity', () => {
    it('returns 1 for identical arrays', () => {
        expect(arraySimilarity(['a', 'b', 'c'], ['a', 'b', 'c'])).toBe(1);
    });

    it('computes correct Jaccard similarity', () => {
        // Intersection: {a, b}, Union: {a, b, c, d} → 2/4 = 0.5
        expect(arraySimilarity(['a', 'b'], ['b', 'c', 'd', 'a'])).toBe(0.5);
    });

    it('returns 0 for disjoint arrays', () => {
        expect(arraySimilarity(['a', 'b'], ['c', 'd'])).toBe(0);
    });

    it('returns 0 for empty arrays', () => {
        expect(arraySimilarity([], ['a'])).toBe(0);
        expect(arraySimilarity(['a'], [])).toBe(0);
        expect(arraySimilarity([], [])).toBe(0);
    });

    it('returns 0 for non-array inputs', () => {
        expect(arraySimilarity(null as any, ['a'])).toBe(0);
        expect(arraySimilarity(['a'], undefined as any)).toBe(0);
        expect(arraySimilarity('abc' as any, 'abc' as any)).toBe(0);
    });

    it('is case-insensitive', () => {
        expect(arraySimilarity(['JavaScript'], ['javascript'])).toBe(1);
        expect(arraySimilarity(['A', 'B'], ['a', 'b'])).toBe(1);
    });

    it('handles deduplication via Set', () => {
        // ['a', 'a'] → Set {'a'}, ['a'] → Set {'a'} → Jaccard = 1/1 = 1
        expect(arraySimilarity(['a', 'a'], ['a'])).toBe(1);
    });
});

describe('ordinalSimilarity', () => {
    const scale = ['junior', 'mid', 'senior', 'lead', 'executive'];

    it('returns 1 for identical values', () => {
        expect(ordinalSimilarity(scale, 'senior', 'senior')).toBe(1);
    });

    it('returns correct distance fraction', () => {
        // junior (0) vs senior (2) → 1 - 2/4 = 0.5
        expect(ordinalSimilarity(scale, 'junior', 'senior')).toBe(0.5);
    });

    it('returns 0 for maximum distance', () => {
        // junior (0) vs executive (4) → 1 - 4/4 = 0
        expect(ordinalSimilarity(scale, 'junior', 'executive')).toBe(0);
    });

    it('returns 0 when value not in scale', () => {
        expect(ordinalSimilarity(scale, 'intern', 'senior')).toBe(0);
        expect(ordinalSimilarity(scale, 'senior', 'intern')).toBe(0);
    });

    it('returns 0 for null/undefined values', () => {
        expect(ordinalSimilarity(scale, null, 'senior')).toBe(0);
        expect(ordinalSimilarity(scale, 'senior', undefined)).toBe(0);
    });

    it('returns 0 for invalid scales', () => {
        expect(ordinalSimilarity([], 'a', 'b')).toBe(0);
        expect(ordinalSimilarity(['only_one'], 'only_one', 'only_one')).toBe(0);
        expect(ordinalSimilarity(null as any, 'a', 'b')).toBe(0);
    });

    it('is case-insensitive', () => {
        expect(ordinalSimilarity(scale, 'JUNIOR', 'junior')).toBe(1);
        expect(ordinalSimilarity(scale, 'Senior', 'SENIOR')).toBe(1);
    });
});

describe('numericSimilarity', () => {
    it('returns 1 for identical values', () => {
        expect(numericSimilarity(5, 5, 10)).toBe(1);
    });

    it('returns correct proximity', () => {
        // |25 - 30| / 10 = 0.5 → 1 - 0.5 = 0.5
        expect(numericSimilarity(25, 30, 10)).toBe(0.5);
    });

    it('returns 0 when distance exceeds maxDistance', () => {
        expect(numericSimilarity(0, 20, 10)).toBe(0);
    });

    it('returns 0 for non-finite values', () => {
        expect(numericSimilarity(NaN, 5, 10)).toBe(0);
        expect(numericSimilarity(5, Infinity, 10)).toBe(0);
    });

    it('returns 0 for invalid maxDistance', () => {
        expect(numericSimilarity(5, 5, 0)).toBe(0);
        expect(numericSimilarity(5, 5, -1)).toBe(0);
        expect(numericSimilarity(5, 5, NaN)).toBe(0);
    });

    it('handles negative values correctly', () => {
        // |-5 - 5| / 20 = 0.5 → 1 - 0.5 = 0.5
        expect(numericSimilarity(-5, 5, 20)).toBe(0.5);
    });
});

describe('scoreAttribute', () => {
    it('dispatches to the correct scorer based on type', () => {
        expect(scoreAttribute('tech', 'tech', { field: 'industry', type: 'exact', weight: 1, config: {} })).toBe(1);
        expect(scoreAttribute(['a', 'b'], ['b', 'c'], { field: 'interests', type: 'array_similarity', weight: 1, config: {} })).toBeCloseTo(0.333, 2);
    });

    it('falls back to exact match for unknown types', () => {
        expect(scoreAttribute('x', 'x', { field: 'f', type: 'custom_unknown' as any, weight: 1, config: {} })).toBe(1);
        expect(scoreAttribute('x', 'y', { field: 'f', type: 'custom_unknown' as any, weight: 1, config: {} })).toBe(0);
    });

    it('handles ordinal type with config', () => {
        const attr = { field: 'level', type: 'ordinal' as const, weight: 1, config: { scale: ['low', 'mid', 'high'] } };
        expect(scoreAttribute('low', 'high', attr)).toBe(0);
        expect(scoreAttribute('mid', 'mid', attr)).toBe(1);
    });

    it('handles numeric type with config', () => {
        const attr = { field: 'age', type: 'numeric' as const, weight: 1, config: { maxDistance: 10 } };
        expect(scoreAttribute(25, 30, attr)).toBe(0.5);
    });

    it('returns 0 on scoring error without crashing', () => {
        // Force an error by passing unexpected data
        const attr = { field: 'f', type: 'numeric' as const, weight: 1, config: { maxDistance: 0 } };
        expect(scoreAttribute('not_a_number', 'also_not', attr)).toBe(0);
    });
});

describe('scorerRegistry', () => {
    it('contains all four built-in scorers', () => {
        expect(scorerRegistry).toHaveProperty('exact');
        expect(scorerRegistry).toHaveProperty('array_similarity');
        expect(scorerRegistry).toHaveProperty('ordinal');
        expect(scorerRegistry).toHaveProperty('numeric');
    });
});
