jest.mock('@/core', () => ({
    logger: { debug: jest.fn(), warn: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

import {
    satisfiesConstraint,
    checkHardConstraints,
    checkPreferenceConstraints,
    preferencesToConstraints,
    applySoftConstraintPenalties,
} from '~/matching/engine/constraints';
import type { ConstraintRule, MatchableAttendee } from '~/matching/interfaces';

// ─── Test Helpers ───────────────────────────────────────

function makeAttendee(overrides: Partial<MatchableAttendee> = {}): MatchableAttendee {
    return {
        id: 'a1',
        eventId: 'e1',
        tenantId: 't1',
        name: 'Test User',
        profile: {},
        preferences: [],
        enrichedProfile: null,
        status: 'pending',
        ...overrides,
    };
}

// ─── satisfiesConstraint ────────────────────────────────

describe('satisfiesConstraint', () => {
    const attendee = makeAttendee({ profile: { gender: 'male', age: 25, skills: ['js', 'ts'] } });

    describe('eq operator', () => {
        it('passes when values are equal', () => {
            const candidate = makeAttendee({ profile: { industry: 'tech' } });
            const constraint: ConstraintRule = { field: 'industry', operator: 'eq', value: 'tech', type: 'hard' };
            expect(satisfiesConstraint(attendee, candidate, constraint)).toBe(true);
        });

        it('fails when values differ', () => {
            const candidate = makeAttendee({ profile: { industry: 'finance' } });
            const constraint: ConstraintRule = { field: 'industry', operator: 'eq', value: 'tech', type: 'hard' };
            expect(satisfiesConstraint(attendee, candidate, constraint)).toBe(false);
        });
    });

    describe('neq operator', () => {
        it('passes when values are not equal', () => {
            const candidate = makeAttendee({ profile: { gender: 'female' } });
            const constraint: ConstraintRule = { field: 'gender', operator: 'neq', value: 'male', type: 'hard' };
            expect(satisfiesConstraint(attendee, candidate, constraint)).toBe(true);
        });

        it('fails when values are equal', () => {
            const candidate = makeAttendee({ profile: { gender: 'male' } });
            const constraint: ConstraintRule = { field: 'gender', operator: 'neq', value: 'male', type: 'hard' };
            expect(satisfiesConstraint(attendee, candidate, constraint)).toBe(false);
        });
    });

    describe('in operator', () => {
        it('passes when candidate value is in the list', () => {
            const candidate = makeAttendee({ profile: { role: 'engineer' } });
            const constraint: ConstraintRule = { field: 'role', operator: 'in', value: ['engineer', 'designer'], type: 'hard' };
            expect(satisfiesConstraint(attendee, candidate, constraint)).toBe(true);
        });

        it('fails when candidate value is not in the list', () => {
            const candidate = makeAttendee({ profile: { role: 'manager' } });
            const constraint: ConstraintRule = { field: 'role', operator: 'in', value: ['engineer', 'designer'], type: 'hard' };
            expect(satisfiesConstraint(attendee, candidate, constraint)).toBe(false);
        });

        it('returns false when value is not an array', () => {
            const candidate = makeAttendee({ profile: { role: 'engineer' } });
            const constraint: ConstraintRule = { field: 'role', operator: 'in', value: 'engineer', type: 'hard' };
            expect(satisfiesConstraint(attendee, candidate, constraint)).toBe(false);
        });
    });

    describe('not_in operator', () => {
        it('passes when candidate value is not in the list', () => {
            const candidate = makeAttendee({ profile: { role: 'manager' } });
            const constraint: ConstraintRule = { field: 'role', operator: 'not_in', value: ['engineer', 'designer'], type: 'hard' };
            expect(satisfiesConstraint(attendee, candidate, constraint)).toBe(true);
        });

        it('fails when candidate value is in the list', () => {
            const candidate = makeAttendee({ profile: { role: 'engineer' } });
            const constraint: ConstraintRule = { field: 'role', operator: 'not_in', value: ['engineer', 'designer'], type: 'hard' };
            expect(satisfiesConstraint(attendee, candidate, constraint)).toBe(false);
        });
    });

    describe('range operator', () => {
        it('passes when within range', () => {
            const candidate = makeAttendee({ profile: { age: 25 } });
            const constraint: ConstraintRule = { field: 'age', operator: 'range', value: [20, 30], type: 'hard' };
            expect(satisfiesConstraint(attendee, candidate, constraint)).toBe(true);
        });

        it('fails when outside range', () => {
            const candidate = makeAttendee({ profile: { age: 35 } });
            const constraint: ConstraintRule = { field: 'age', operator: 'range', value: [20, 30], type: 'hard' };
            expect(satisfiesConstraint(attendee, candidate, constraint)).toBe(false);
        });

        it('includes boundary values', () => {
            const candidateLow = makeAttendee({ profile: { age: 20 } });
            const candidateHigh = makeAttendee({ profile: { age: 30 } });
            const constraint: ConstraintRule = { field: 'age', operator: 'range', value: [20, 30], type: 'hard' };
            expect(satisfiesConstraint(attendee, candidateLow, constraint)).toBe(true);
            expect(satisfiesConstraint(attendee, candidateHigh, constraint)).toBe(true);
        });

        it('returns false for non-array value', () => {
            const candidate = makeAttendee({ profile: { age: 25 } });
            const constraint: ConstraintRule = { field: 'age', operator: 'range', value: 25, type: 'hard' };
            expect(satisfiesConstraint(attendee, candidate, constraint)).toBe(false);
        });
    });

    describe('gte / lte operators', () => {
        it('gte passes for greater or equal', () => {
            const candidate = makeAttendee({ profile: { experience: 5 } });
            const constraint: ConstraintRule = { field: 'experience', operator: 'gte', value: 3, type: 'hard' };
            expect(satisfiesConstraint(attendee, candidate, constraint)).toBe(true);
        });

        it('gte fails for less than', () => {
            const candidate = makeAttendee({ profile: { experience: 2 } });
            const constraint: ConstraintRule = { field: 'experience', operator: 'gte', value: 3, type: 'hard' };
            expect(satisfiesConstraint(attendee, candidate, constraint)).toBe(false);
        });

        it('lte passes for less or equal', () => {
            const candidate = makeAttendee({ profile: { budget: 100 } });
            const constraint: ConstraintRule = { field: 'budget', operator: 'lte', value: 200, type: 'hard' };
            expect(satisfiesConstraint(attendee, candidate, constraint)).toBe(true);
        });
    });

    describe('field references', () => {
        it('resolves value from attendee profile', () => {
            const candidate = makeAttendee({ profile: { gender: 'female' } });
            // "candidate.gender must not equal attendee.gender"
            const constraint: ConstraintRule = { field: 'gender', operator: 'neq', value: { field: 'gender' }, type: 'hard' };
            expect(satisfiesConstraint(attendee, candidate, constraint)).toBe(true);
        });

        it('fails when field reference resolves to matching value', () => {
            const candidate = makeAttendee({ profile: { gender: 'male' } });
            const constraint: ConstraintRule = { field: 'gender', operator: 'neq', value: { field: 'gender' }, type: 'hard' };
            expect(satisfiesConstraint(attendee, candidate, constraint)).toBe(false);
        });
    });

    describe('missing field on candidate', () => {
        it('returns false when candidate is missing the field', () => {
            const candidate = makeAttendee({ profile: {} });
            const constraint: ConstraintRule = { field: 'industry', operator: 'eq', value: 'tech', type: 'hard' };
            expect(satisfiesConstraint(attendee, candidate, constraint)).toBe(false);
        });
    });
});

// ─── checkHardConstraints ───────────────────────────────

describe('checkHardConstraints', () => {
    it('returns true when no hard constraints exist', () => {
        const a = makeAttendee();
        const b = makeAttendee();
        expect(checkHardConstraints(a, b, [])).toBe(true);
    });

    it('returns true when all hard constraints pass bidirectionally', () => {
        const a = makeAttendee({ profile: { age: 25, role: 'engineer' } });
        const b = makeAttendee({ profile: { age: 28, role: 'designer' } });
        const constraints: ConstraintRule[] = [{ field: 'age', operator: 'range', value: [20, 35], type: 'hard' }];
        expect(checkHardConstraints(a, b, constraints)).toBe(true);
    });

    it('returns false when any hard constraint fails', () => {
        const a = makeAttendee({ profile: { age: 15 } });
        const b = makeAttendee({ profile: { age: 25 } });
        const constraints: ConstraintRule[] = [{ field: 'age', operator: 'range', value: [20, 35], type: 'hard' }];
        // a's age (15) fails the range check
        expect(checkHardConstraints(a, b, constraints)).toBe(false);
    });

    it('ignores soft constraints', () => {
        const a = makeAttendee({ profile: { age: 15 } });
        const b = makeAttendee({ profile: { age: 25 } });
        const constraints: ConstraintRule[] = [{ field: 'age', operator: 'range', value: [20, 35], type: 'soft' }];
        expect(checkHardConstraints(a, b, constraints)).toBe(true);
    });
});

// ─── checkPreferenceConstraints ─────────────────────────

describe('checkPreferenceConstraints', () => {
    it('returns true when neither attendee has preferences', () => {
        const a = makeAttendee();
        const b = makeAttendee();
        expect(checkPreferenceConstraints(a, b)).toBe(true);
    });

    it('returns true when preferences are satisfied', () => {
        const a = makeAttendee({
            profile: { role: 'engineer' },
            preferences: [{ field: 'role', value: ['designer', 'pm'], type: 'in' }],
        });
        const b = makeAttendee({
            profile: { role: 'designer' },
            preferences: [],
        });
        expect(checkPreferenceConstraints(a, b)).toBe(true);
    });

    it('returns false when attendee A preferences not met', () => {
        const a = makeAttendee({
            preferences: [{ field: 'role', value: ['designer'], type: 'in' }],
        });
        const b = makeAttendee({ profile: { role: 'engineer' } });
        expect(checkPreferenceConstraints(a, b)).toBe(false);
    });

    it('checks bidirectionally — candidate preferences must also be met', () => {
        const a = makeAttendee({ profile: { role: 'designer' } });
        const b = makeAttendee({
            profile: { role: 'engineer' },
            preferences: [{ field: 'role', value: ['pm'], type: 'in' }],
        });
        // b wants the OTHER person to be 'pm', but a is 'designer'
        expect(checkPreferenceConstraints(a, b)).toBe(false);
    });
});

// ─── preferencesToConstraints ───────────────────────────

describe('preferencesToConstraints', () => {
    it('converts preferences to hard constraints', () => {
        const prefs = [
            { field: 'role', value: ['engineer', 'designer'], type: 'in' as const },
            { field: 'age', value: [20, 30], type: 'range' as const },
        ];
        const result = preferencesToConstraints(prefs);
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ field: 'role', operator: 'in', value: ['engineer', 'designer'], type: 'hard' });
        expect(result[1]).toEqual({ field: 'age', operator: 'range', value: [20, 30], type: 'hard' });
    });

    it('returns empty array for non-array input', () => {
        expect(preferencesToConstraints(null as any)).toEqual([]);
        expect(preferencesToConstraints(undefined as any)).toEqual([]);
    });

    it('filters out invalid preferences', () => {
        const prefs = [{ field: 'role', value: ['engineer'], type: 'in' as const }, null as any, { field: '', value: undefined, type: 'in' }];
        const result = preferencesToConstraints(prefs);
        expect(result).toHaveLength(1);
    });
});

// ─── applySoftConstraintPenalties ───────────────────────

describe('applySoftConstraintPenalties', () => {
    it('returns original score when no soft constraints', () => {
        const a = makeAttendee();
        const b = makeAttendee();
        expect(applySoftConstraintPenalties(80, a, b, [])).toBe(80);
    });

    it('subtracts penalty for each failed soft constraint', () => {
        const a = makeAttendee({ profile: { age: 15 } });
        const b = makeAttendee({ profile: { age: 25 } });
        const constraints: ConstraintRule[] = [{ field: 'age', operator: 'range', value: [20, 35], type: 'soft' }];
        // DEFAULT_SOFT_PENALTY is 10
        expect(applySoftConstraintPenalties(80, a, b, constraints)).toBe(70);
    });

    it('clamps score to minimum of 0', () => {
        const a = makeAttendee({ profile: { age: 15 } });
        const b = makeAttendee({ profile: { age: 25 } });
        const constraints: ConstraintRule[] = [{ field: 'age', operator: 'range', value: [20, 35], type: 'soft' }];
        expect(applySoftConstraintPenalties(5, a, b, constraints)).toBe(0);
    });

    it('ignores hard constraints', () => {
        const a = makeAttendee({ profile: { age: 15 } });
        const b = makeAttendee({ profile: { age: 25 } });
        const constraints: ConstraintRule[] = [{ field: 'age', operator: 'range', value: [20, 35], type: 'hard' }];
        expect(applySoftConstraintPenalties(80, a, b, constraints)).toBe(80);
    });
});
