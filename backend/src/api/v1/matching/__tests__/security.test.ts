/**
 * Security & auth tests — handlePrivateRequest, tenant isolation enforcement,
 * and validation schema edge cases.
 */

// ─── Mocks ──────────────────────────────────────────────

jest.mock('@/core', () => {
    const original = jest.requireActual('@/core/utils/Joi');
    return {
        logger: { debug: jest.fn(), warn: jest.fn(), info: jest.fn(), error: jest.fn() },
        UnAuthorizedError: class UnAuthorizedError extends Error {
            constructor(msg: string) {
                super(msg);
                this.name = 'UnAuthorizedError';
            }
        },
        UnProcessableError: class UnProcessableError extends Error {
            constructor(msg: string) {
                super(msg);
                this.name = 'UnProcessableError';
            }
        },
        joiValidate: jest.fn((schema: any, value: any) => {
            const { error } = schema.validate(value, { abortEarly: false });
            if (error) throw new Error(error.message);
        }),
        Joi: original.default ?? original.Joi ?? require('joi'),
    };
});

jest.mock('@/app', () => ({
    dispatch: jest.fn(),
}));

import { dispatch } from '@/app';
import { handlePrivateRequest } from '@/core/handlers/controlBuilder/index.utils';

const mockDispatch = dispatch as jest.Mock;

// ─── handlePrivateRequest ───────────────────────────────

describe('handlePrivateRequest', () => {
    beforeEach(() => jest.clearAllMocks());

    it('noops if req.tenant already set', async () => {
        const req = { tenant: { id: 't1' }, headers: {} } as any;
        await handlePrivateRequest(req);
        expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('throws when X-API-Key header is missing', async () => {
        const req = { tenant: null, headers: {} } as any;
        await expect(handlePrivateRequest(req)).rejects.toThrow('Missing X-API-Key');
    });

    it('throws when API key is invalid (dispatch returns null)', async () => {
        const req = { tenant: null, headers: { 'x-api-key': 'bad-key' } } as any;
        mockDispatch.mockResolvedValue([null]);
        await expect(handlePrivateRequest(req)).rejects.toThrow('Invalid API key');
    });

    it('sets req.tenant when valid key is provided', async () => {
        const tenant = { id: 't1', name: 'Acme' };
        const req = { tenant: null, headers: { 'x-api-key': 'valid-key' } } as any;
        mockDispatch.mockResolvedValue([tenant]);

        await handlePrivateRequest(req);

        expect(req.tenant).toEqual(tenant);
        expect(mockDispatch).toHaveBeenCalledWith('tenant:get-by-api-key', { apiKey: 'valid-key' });
    });
});

// ─── Validation Schema Tests ────────────────────────────

describe('Joi validation schemas', () => {
    // Import schemas — these don't need mocked core because they only use Joi
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { findMatchesSchema, batchMatchSchema, getMatchesSchema, getJobStatusSchema } = require('~/matching/router/schema');

    const validUUID = '550e8400-e29b-41d4-a716-446655440000';

    describe('findMatchesSchema', () => {
        it('accepts valid input', () => {
            const { error: pe } = findMatchesSchema.paramsSchema.validate({ eventId: validUUID });
            expect(pe).toBeUndefined();
            const { error: ie } = findMatchesSchema.inputSchema.validate({
                attendeeId: validUUID,
                limit: 10,
                includeBreakdown: true,
                excludeIds: [validUUID],
            });
            expect(ie).toBeUndefined();
        });

        it('rejects non-UUID eventId', () => {
            const { error } = findMatchesSchema.paramsSchema.validate({ eventId: 'not-a-uuid' });
            expect(error).toBeDefined();
        });

        it('rejects missing attendeeId', () => {
            const { error } = findMatchesSchema.inputSchema.validate({});
            expect(error).toBeDefined();
        });

        it('rejects limit > 100', () => {
            const { error } = findMatchesSchema.inputSchema.validate({
                attendeeId: validUUID,
                limit: 999,
            });
            expect(error).toBeDefined();
        });

        it('rejects limit < 1', () => {
            const { error } = findMatchesSchema.inputSchema.validate({
                attendeeId: validUUID,
                limit: 0,
            });
            expect(error).toBeDefined();
        });
    });

    describe('batchMatchSchema', () => {
        it('accepts valid params', () => {
            const { error } = batchMatchSchema.paramsSchema.validate({ eventId: validUUID });
            expect(error).toBeUndefined();
        });

        it('rejects missing eventId', () => {
            const { error } = batchMatchSchema.paramsSchema.validate({});
            expect(error).toBeDefined();
        });
    });

    describe('getMatchesSchema', () => {
        it('accepts valid query with optional fields', () => {
            const { error } = getMatchesSchema.querySchema.validate({
                page: 1,
                pageSize: 50,
                attendeeId: validUUID,
            });
            expect(error).toBeUndefined();
        });

        it('rejects pageSize > 100', () => {
            const { error } = getMatchesSchema.querySchema.validate({ pageSize: 200 });
            expect(error).toBeDefined();
        });

        it('rejects page < 1', () => {
            const { error } = getMatchesSchema.querySchema.validate({ page: 0 });
            expect(error).toBeDefined();
        });
    });

    describe('getJobStatusSchema', () => {
        it('accepts valid eventId and jobId', () => {
            const { error } = getJobStatusSchema.paramsSchema.validate({
                eventId: validUUID,
                jobId: validUUID,
            });
            expect(error).toBeUndefined();
        });

        it('rejects missing jobId', () => {
            const { error } = getJobStatusSchema.paramsSchema.validate({ eventId: validUUID });
            expect(error).toBeDefined();
        });

        it('rejects non-UUID jobId', () => {
            const { error } = getJobStatusSchema.paramsSchema.validate({
                eventId: validUUID,
                jobId: '12345',
            });
            expect(error).toBeDefined();
        });
    });
});
