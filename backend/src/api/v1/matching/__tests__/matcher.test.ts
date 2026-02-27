import type { MatchableAttendee, MatchingConfig } from '~/matching/interfaces';

/**
 * We mock the logger so it doesn't produce output during tests and so
 * we can assert on specific warnings.
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

import { calculateMatchScore } from '~/matching/engine/matcher';

// ─── Helpers ────────────────────────────────────────────

function makeAttendee(overrides: Partial<MatchableAttendee> = {}): MatchableAttendee {
    return {
        id: 'a1',
        eventId: 'e1',
        tenantId: 't1',
        name: 'Attendee A',
        profile: {},
        preferences: [],
        enrichedProfile: null,
        status: 'pending',
        ...overrides,
    };
}

// ─── Tests ──────────────────────────────────────────────

describe('calculateMatchScore', () => {
    const baseConfig: MatchingConfig = {
        matchThreshold: 50,
        attributes: [
            { field: 'interests', type: 'array_similarity', weight: 0.5, config: {} },
            { field: 'industry', type: 'exact', weight: 0.5, config: {} },
        ],
        constraints: [],
        requiredFields: ['interests', 'industry'],
    };

    it('returns a score between 0 and 100 for compatible attendees', () => {
        const a = makeAttendee({ profile: { interests: ['js', 'ts'], industry: 'tech' } });
        const b = makeAttendee({ id: 'b1', profile: { interests: ['js', 'rust'], industry: 'tech' } });
        const result = calculateMatchScore(a, b, baseConfig);

        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
        expect(result.breakdown).toHaveProperty('interests');
        expect(result.breakdown).toHaveProperty('industry');
    });

    it('returns 100 for identical profiles', () => {
        const a = makeAttendee({ profile: { interests: ['ai', 'ml'], industry: 'tech' } });
        const b = makeAttendee({ id: 'b1', profile: { interests: ['ai', 'ml'], industry: 'tech' } });
        const result = calculateMatchScore(a, b, baseConfig);
        expect(result.score).toBe(100);
    });

    it('returns 0 when a hard constraint fails', () => {
        const config: MatchingConfig = {
            ...baseConfig,
            constraints: [{ field: 'gender', operator: 'neq', value: { field: 'gender' } as any, type: 'hard' }],
        };
        const a = makeAttendee({ profile: { interests: ['js'], industry: 'tech', gender: 'male' } });
        const b = makeAttendee({ id: 'b1', profile: { interests: ['js'], industry: 'tech', gender: 'male' } });
        const result = calculateMatchScore(a, b, config);
        expect(result.score).toBe(0);
        expect(result.breakdown).toEqual({});
    });

    it('returns 0 when a preference constraint fails', () => {
        const a = makeAttendee({
            profile: { interests: ['js'], industry: 'tech', role: 'engineer' },
            preferences: [{ field: 'role', value: ['designer'], type: 'in' }],
        });
        const b = makeAttendee({
            id: 'b1',
            profile: { interests: ['js'], industry: 'tech', role: 'pm' },
        });
        const result = calculateMatchScore(a, b, baseConfig);
        expect(result.score).toBe(0);
    });

    it('applies soft constraint penalties', () => {
        const configWithSoft: MatchingConfig = {
            ...baseConfig,
            constraints: [{ field: 'age', operator: 'range', value: [20, 30], type: 'soft' }],
        };
        const a = makeAttendee({ profile: { interests: ['js', 'ts'], industry: 'tech', age: 18 } });
        const b = makeAttendee({ id: 'b1', profile: { interests: ['js', 'ts'], industry: 'tech', age: 25 } });
        const result = calculateMatchScore(a, b, configWithSoft);
        // Perfect attribute match = 100, minus 10 for soft penalty = 90
        expect(result.score).toBe(90);
    });

    it('returns 0 when no attributes are defined', () => {
        const config: MatchingConfig = { ...baseConfig, attributes: [] };
        const a = makeAttendee({ profile: { interests: ['js'] } });
        const b = makeAttendee({ id: 'b1', profile: { interests: ['js'] } });
        expect(calculateMatchScore(a, b, config).score).toBe(0);
    });

    it('handles missing profile keys gracefully', () => {
        const a = makeAttendee({ profile: { industry: 'tech' } }); // no interests
        const b = makeAttendee({ id: 'b1', profile: { interests: ['js'], industry: 'tech' } });
        const result = calculateMatchScore(a, b, baseConfig);
        // interests score should be 0 (missing on a), industry exact = 1
        // weighted: (0*0.5 + 1*0.5)/1 * 100 = 50
        expect(result.score).toBe(50);
    });

    it('produces deterministic output for the same inputs', () => {
        const a = makeAttendee({ profile: { interests: ['js', 'py'], industry: 'tech' } });
        const b = makeAttendee({ id: 'b1', profile: { interests: ['js', 'rust'], industry: 'finance' } });
        const r1 = calculateMatchScore(a, b, baseConfig);
        const r2 = calculateMatchScore(a, b, baseConfig);
        expect(r1.score).toBe(r2.score);
        expect(r1.breakdown).toEqual(r2.breakdown);
    });

    it('supports numeric attributes', () => {
        const config: MatchingConfig = {
            matchThreshold: 50,
            attributes: [{ field: 'age', type: 'numeric', weight: 1.0, config: { maxDistance: 20 } }],
            constraints: [],
            requiredFields: ['age'],
        };
        const a = makeAttendee({ profile: { age: 25 } });
        const b = makeAttendee({ id: 'b1', profile: { age: 30 } });
        const result = calculateMatchScore(a, b, config);
        // numericSimilarity(25,30,20) = 1 - 5/20 = 0.75 → 75
        expect(result.score).toBe(75);
    });

    it('supports ordinal attributes', () => {
        const config: MatchingConfig = {
            matchThreshold: 50,
            attributes: [
                {
                    field: 'level',
                    type: 'ordinal',
                    weight: 1.0,
                    config: { scale: ['junior', 'mid', 'senior', 'lead'] },
                },
            ],
            constraints: [],
            requiredFields: ['level'],
        };
        const a = makeAttendee({ profile: { level: 'junior' } });
        const b = makeAttendee({ id: 'b1', profile: { level: 'senior' } });
        const result = calculateMatchScore(a, b, config);
        // 1 - |0-2|/3 = 0.333 → 33
        expect(result.score).toBe(33);
    });
});
