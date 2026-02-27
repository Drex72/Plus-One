jest.mock('@/core', () => ({
    logger: { debug: jest.fn(), warn: jest.fn(), info: jest.fn(), error: jest.fn() },
    BadRequestError: class BadRequestError extends Error {
        constructor(msg: string) {
            super(msg);
            this.name = 'BadRequestError';
        }
    },
}));

import { validateMatchingConfig, generateDefaultAttributes } from '~/matching/engine/validators';
import type { MatchingConfig, AttributeConfig } from '~/matching/interfaces';

// ─── validateMatchingConfig ─────────────────────────────

describe('validateMatchingConfig', () => {
    const validConfig: MatchingConfig = {
        matchThreshold: 50,
        attributes: [
            { field: 'skills', type: 'array_similarity', weight: 0.5, config: {} },
            { field: 'industry', type: 'exact', weight: 0.5, config: {} },
        ],
        constraints: [],
        requiredFields: [],
    };

    it('accepts a valid config without throwing', () => {
        expect(() => validateMatchingConfig(validConfig)).not.toThrow();
    });

    it('throws when config is null/undefined', () => {
        expect(() => validateMatchingConfig(null as any)).toThrow('Matching config is required');
    });

    it('throws when no attributes are defined', () => {
        expect(() => validateMatchingConfig({ ...validConfig, attributes: [] })).toThrow('at least one attribute');
    });

    it('throws when an attribute weight is negative', () => {
        const config: MatchingConfig = {
            ...validConfig,
            attributes: [{ field: 'x', type: 'exact', weight: -0.5, config: {} }],
        };
        expect(() => validateMatchingConfig(config)).toThrow('weight must be between 0 and 1');
    });

    it('throws when an attribute weight exceeds 1', () => {
        const config: MatchingConfig = {
            ...validConfig,
            attributes: [{ field: 'x', type: 'exact', weight: 1.5, config: {} }],
        };
        expect(() => validateMatchingConfig(config)).toThrow('weight must be between 0 and 1');
    });

    it('throws when an attribute has no field name', () => {
        const config: MatchingConfig = {
            ...validConfig,
            attributes: [{ field: '', type: 'exact', weight: 0.5, config: {} }],
        };
        expect(() => validateMatchingConfig(config)).toThrow('must have a "field" name');
    });

    it('throws when ordinal attribute lacks scale', () => {
        const config: MatchingConfig = {
            ...validConfig,
            attributes: [{ field: 'level', type: 'ordinal', weight: 1.0, config: {} }],
        };
        expect(() => validateMatchingConfig(config)).toThrow('requires a "scale" array');
    });

    it('throws when ordinal scale has fewer than 2 values', () => {
        const config: MatchingConfig = {
            ...validConfig,
            attributes: [{ field: 'level', type: 'ordinal', weight: 1.0, config: { scale: ['one'] } }],
        };
        expect(() => validateMatchingConfig(config)).toThrow('requires a "scale" array with at least 2 values');
    });

    it('warns when weights do not sum to 1.0', () => {
        const { logger } = require('@/core');
        const config: MatchingConfig = {
            ...validConfig,
            attributes: [
                { field: 'a', type: 'exact', weight: 0.3, config: {} },
                { field: 'b', type: 'exact', weight: 0.3, config: {} },
            ],
        };
        validateMatchingConfig(config);
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('weights sum to'));
    });

    it('warns when numeric attribute has no maxDistance', () => {
        const { logger } = require('@/core');
        const config: MatchingConfig = {
            ...validConfig,
            attributes: [{ field: 'age', type: 'numeric', weight: 1.0, config: {} }],
        };
        validateMatchingConfig(config);
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('no maxDistance'));
    });

    it('warns when constraint references field not in requiredFields', () => {
        const { logger } = require('@/core');
        const config: MatchingConfig = {
            ...validConfig,
            constraints: [{ field: 'notListed', operator: 'eq', value: 'x', type: 'hard' }],
            requiredFields: ['skills'],
        };
        validateMatchingConfig(config);
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('not in requiredFields'));
    });
});

// ─── generateDefaultAttributes ──────────────────────────

describe('generateDefaultAttributes', () => {
    it('returns empty for empty input', () => {
        expect(generateDefaultAttributes([])).toEqual([]);
    });

    it('returns empty for null/undefined', () => {
        expect(generateDefaultAttributes(null as any)).toEqual([]);
        expect(generateDefaultAttributes(undefined as any)).toEqual([]);
    });

    it('assigns equal weights across all fields', () => {
        const attrs = generateDefaultAttributes(['a', 'b', 'c']);
        expect(attrs).toHaveLength(3);
        const expectedWeight = 1.0 / 3;
        for (const attr of attrs) {
            expect(attr.weight).toBeCloseTo(expectedWeight, 5);
        }
    });

    it('infers array_similarity for fields containing "skill" or "interest"', () => {
        const attrs = generateDefaultAttributes(['skills', 'interests', 'hobbies']);
        for (const attr of attrs) {
            expect(attr.type).toBe('array_similarity');
        }
    });

    it('infers array_similarity for plural fields (ending in "s")', () => {
        const attrs = generateDefaultAttributes(['languages']);
        expect(attrs[0].type).toBe('array_similarity');
    });

    it('infers numeric for fields containing "age", "salary", "budget"', () => {
        const attrs = generateDefaultAttributes(['age', 'salary', 'budget']);
        for (const attr of attrs) {
            expect(attr.type).toBe('numeric');
            expect(attr.config?.maxDistance).toBe(10);
        }
    });

    it('infers ordinal for fields containing "level" or "experience"', () => {
        const attrs = generateDefaultAttributes(['level', 'experience']);
        for (const attr of attrs) {
            expect(attr.type).toBe('ordinal');
            expect(attr.config?.scale).toBeDefined();
            expect(attr.config!.scale!.length).toBeGreaterThanOrEqual(2);
        }
    });

    it('defaults to exact match for unrecognized fields', () => {
        const attrs = generateDefaultAttributes(['city']);
        expect(attrs[0].type).toBe('exact');
    });

    it('does not infer array_similarity for words ending in "ss" or "us"', () => {
        const attrs = generateDefaultAttributes(['class', 'campus']);
        for (const attr of attrs) {
            expect(attr.type).toBe('exact');
        }
    });
});
