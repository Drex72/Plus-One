import { normalizePreferences, normalizeProfile, toMatchableAttendee, pairKey, chunk, shuffleArray } from '~/matching/engine/utils';

// ─── normalizePreferences ───────────────────────────────

describe('normalizePreferences', () => {
    it('returns empty array for null/undefined', () => {
        expect(normalizePreferences(null)).toEqual([]);
        expect(normalizePreferences(undefined)).toEqual([]);
    });

    it('returns empty for falsy values', () => {
        expect(normalizePreferences(0)).toEqual([]);
        expect(normalizePreferences('')).toEqual([]);
        expect(normalizePreferences(false)).toEqual([]);
    });

    it('returns valid preferences from an array', () => {
        const prefs = [
            { field: 'role', value: ['engineer'], type: 'in' },
            { field: 'age', value: [20, 30], type: 'range' },
        ];
        expect(normalizePreferences(prefs)).toEqual(prefs);
    });

    it('filters out invalid items from array', () => {
        const raw = [
            { field: 'role', value: ['engineer'], type: 'in' },
            { field: 'bad' }, // missing value & type
            null,
            42,
            'string',
        ];
        const result = normalizePreferences(raw);
        expect(result).toHaveLength(1);
        expect(result[0].field).toBe('role');
    });

    it('wraps a single valid preference in an array', () => {
        const pref = { field: 'role', value: ['pm'], type: 'in' };
        expect(normalizePreferences(pref)).toEqual([pref]);
    });

    it('returns empty for a single invalid object', () => {
        expect(normalizePreferences({ foo: 'bar' })).toEqual([]);
    });
});

// ─── normalizeProfile ───────────────────────────────────

describe('normalizeProfile', () => {
    it('returns empty object for null/undefined', () => {
        expect(normalizeProfile(null)).toEqual({});
        expect(normalizeProfile(undefined)).toEqual({});
    });

    it('returns empty for non-object types', () => {
        expect(normalizeProfile('string')).toEqual({});
        expect(normalizeProfile(42)).toEqual({});
        expect(normalizeProfile(true)).toEqual({});
    });

    it('returns empty for arrays', () => {
        expect(normalizeProfile([1, 2, 3])).toEqual({});
    });

    it('passes through a valid object', () => {
        const profile = { industry: 'tech', skills: ['js'] };
        expect(normalizeProfile(profile)).toEqual(profile);
    });
});

// ─── toMatchableAttendee ────────────────────────────────

describe('toMatchableAttendee', () => {
    it('converts a database row to MatchableAttendee', () => {
        const row = {
            id: 'a1',
            event_id: 'e1',
            tenant_id: 't1',
            name: 'Alice',
            attributes: { industry: 'tech', skills: ['js', 'ts'] },
            preferences: [{ field: 'role', value: ['engineer'], type: 'in' }],
            status: 'pending',
        };
        const result = toMatchableAttendee(row);
        expect(result).toEqual({
            id: 'a1',
            eventId: 'e1',
            tenantId: 't1',
            name: 'Alice',
            profile: { industry: 'tech', skills: ['js', 'ts'] },
            preferences: [{ field: 'role', value: ['engineer'], type: 'in' }],
            status: 'pending',
        });
    });

    it('normalizes null attributes to empty profile', () => {
        const row = { id: 'a1', event_id: 'e1', tenant_id: 't1', name: 'Bob', attributes: null, preferences: null, status: 'pending' };
        const result = toMatchableAttendee(row);
        expect(result.profile).toEqual({});
        expect(result.preferences).toEqual([]);
    });
});

// ─── pairKey ────────────────────────────────────────────

describe('pairKey', () => {
    it('produces a canonical key regardless of argument order', () => {
        expect(pairKey('a', 'b')).toBe('a:b');
        expect(pairKey('b', 'a')).toBe('a:b');
    });

    it('handles equal ids', () => {
        expect(pairKey('x', 'x')).toBe('x:x');
    });

    it('handles UUIDs', () => {
        const id1 = '11111111-1111-1111-1111-111111111111';
        const id2 = '22222222-2222-2222-2222-222222222222';
        expect(pairKey(id1, id2)).toBe(`${id1}:${id2}`);
        expect(pairKey(id2, id1)).toBe(`${id1}:${id2}`);
    });
});

// ─── chunk ──────────────────────────────────────────────

describe('chunk', () => {
    it('splits array into chunks of given size', () => {
        expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('handles empty array', () => {
        expect(chunk([], 3)).toEqual([]);
    });

    it('handles size larger than array length', () => {
        expect(chunk([1, 2], 10)).toEqual([[1, 2]]);
    });

    it('handles size of 1', () => {
        expect(chunk([1, 2, 3], 1)).toEqual([[1], [2], [3]]);
    });

    it('handles exact divisor', () => {
        expect(chunk([1, 2, 3, 4], 2)).toEqual([
            [1, 2],
            [3, 4],
        ]);
    });
});

// ─── shuffleArray ───────────────────────────────────────

describe('shuffleArray', () => {
    it('returns an array with the same elements', () => {
        const original = [1, 2, 3, 4, 5];
        const copy = [...original];
        shuffleArray(copy);
        expect(copy.sort()).toEqual(original.sort());
    });

    it('mutates in place (returns same reference)', () => {
        const arr = [1, 2, 3];
        const result = shuffleArray(arr);
        expect(result).toBe(arr);
    });

    it('handles empty array', () => {
        expect(shuffleArray([])).toEqual([]);
    });

    it('handles single element', () => {
        expect(shuffleArray([42])).toEqual([42]);
    });

    it('produces different orderings (probabilistic)', () => {
        // Run 50 shuffles of a 10-element array — at least one should differ from the original
        const original = Array.from({ length: 10 }, (_, i) => i);
        let sawDifferent = false;
        for (let i = 0; i < 50; i++) {
            const copy = [...original];
            shuffleArray(copy);
            if (JSON.stringify(copy) !== JSON.stringify(original)) {
                sawDifferent = true;
                break;
            }
        }
        expect(sawDifferent).toBe(true);
    });
});
