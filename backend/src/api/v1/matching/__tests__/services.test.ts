/**
 * Service-layer tests — FindMatches, BatchMatchEvent, GetMatches, GetJobStatus.
 *
 * All external dependencies (MatchRepository, dispatch, config, logger) are mocked.
 * Each test focuses on the service logic: validation, tenant isolation, delegation.
 */

// ─── Mocks ──────────────────────────────────────────────

jest.mock('@/core', () => ({
    logger: { debug: jest.fn(), warn: jest.fn(), info: jest.fn(), error: jest.fn() },
    BadRequestError: class BadRequestError extends Error {
        constructor(msg: string) {
            super(msg);
            this.name = 'BadRequestError';
        }
    },
    UnAuthorizedError: class UnAuthorizedError extends Error {
        constructor(msg: string) {
            super(msg);
            this.name = 'UnAuthorizedError';
        }
    },
    NotFoundError: class NotFoundError extends Error {
        constructor(msg: string) {
            super(msg);
            this.name = 'NotFoundError';
        }
    },
    BaseService: class BaseService {
        protected supabase: any = {};
    },
    BaseRepository: class BaseRepository {
        protected table = '';
    },
    supabaseAdmin: {},
    HttpStatus: { OK: 200, ACCEPTED: 202, CREATED: 201 },
}));

jest.mock('@/core/config', () => ({
    config: {
        matching: { threshold: 50, maxBatchSize: 1000 - 0 },
        appEnvironment: 'development',
    },
}));

jest.mock('@/app', () => ({
    dispatch: jest.fn(),
}));

// Mock the engine module (specifically the expensive computations)
jest.mock('~/matching/engine', () => ({
    calculateMatchScore: jest.fn(),
    validateMatchingConfig: jest.fn(),
    pairKey: jest.requireActual('~/matching/engine/utils').pairKey,
    shuffleArray: jest.fn((arr: unknown[]) => arr), // no-op in tests
}));

// ─── Imports ────────────────────────────────────────────

import { dispatch } from '@/app';
import { calculateMatchScore, validateMatchingConfig } from '~/matching/engine';
import { FindMatches } from '~/matching/services/find-matches';
import { BatchMatchEvent } from '~/matching/services/batch-match';
import { GetMatches } from '~/matching/services/get-matches';
import { GetJobStatus } from '~/matching/services/get-job-status';
import type { MatchingConfig, MatchableAttendee } from '~/matching/interfaces';

const mockDispatch = dispatch as jest.Mock;
const mockCalcScore = calculateMatchScore as jest.Mock;
const mockValidate = validateMatchingConfig as jest.Mock;

// ─── Fake Data ──────────────────────────────────────────

const TENANT = { id: 'tenant-1', name: 'Acme' };
const EVENT = {
    id: 'event-1',
    tenantId: 'tenant-1',
    matchingConfig: {
        matchThreshold: 50,
        attributes: [{ field: 'skills', type: 'array_similarity', weight: 1, config: {} }],
        constraints: [],
        requiredFields: ['skills'],
    } satisfies MatchingConfig,
};

function fakeAttendee(id: string, profile: Record<string, unknown> = {}): MatchableAttendee {
    return { id, eventId: 'event-1', tenantId: 'tenant-1', name: `User ${id}`, profile, preferences: [], enrichedProfile: null, status: 'pending' };
}

function makeRequest(tenant: any = TENANT) {
    return { tenant } as any;
}

// ─── Fake Repository ────────────────────────────────────

function createMockRepo() {
    return {
        getMatchableAttendee: jest.fn(),
        getMatchPool: jest.fn(),
        findByEvent: jest.fn(),
        createMatch: jest.fn(),
        createManyMatches: jest.fn(),
        createJob: jest.fn(),
        updateJob: jest.fn(),
        deleteMatchesByEvent: jest.fn(),
        getJobById: jest.fn(),
    };
}

// ─── FindMatches ────────────────────────────────────────

describe('FindMatches service', () => {
    let service: FindMatches;
    let repo: ReturnType<typeof createMockRepo>;

    beforeEach(() => {
        jest.clearAllMocks();
        repo = createMockRepo();
        service = new FindMatches(repo as any);
        mockDispatch.mockResolvedValue([EVENT]);
    });

    it('throws when tenant is missing', async () => {
        await expect(
            service.handle({ input: { attendeeId: 'a1' }, request: { tenant: null } as any, params: { eventId: 'event-1' } } as any),
        ).rejects.toThrow('Invalid Tenant');
    });

    it('throws when event not found', async () => {
        mockDispatch.mockResolvedValue([null]);
        await expect(service.handle({ input: { attendeeId: 'a1' }, request: makeRequest(), params: { eventId: 'event-1' } } as any)).rejects.toThrow(
            'Event not found',
        );
    });

    it('throws when tenant does not own the event', async () => {
        const foreignEvent = { ...EVENT, tenantId: 'other-tenant' };
        mockDispatch.mockResolvedValue([foreignEvent]);
        await expect(service.handle({ input: { attendeeId: 'a1' }, request: makeRequest(), params: { eventId: 'event-1' } } as any)).rejects.toThrow(
            'Event not found',
        );
    });

    it('throws when attendee not found', async () => {
        repo.getMatchableAttendee.mockResolvedValue(null);
        await expect(service.handle({ input: { attendeeId: 'a1' }, request: makeRequest(), params: { eventId: 'event-1' } } as any)).rejects.toThrow(
            'Attendee not found',
        );
    });

    it('throws when attendee does not belong to the event', async () => {
        repo.getMatchableAttendee.mockResolvedValue(fakeAttendee('a1', { skills: ['js'] }));
        // attendee eventId doesn't match param
        repo.getMatchableAttendee.mockResolvedValue({ ...fakeAttendee('a1'), eventId: 'other-event' });
        await expect(service.handle({ input: { attendeeId: 'a1' }, request: makeRequest(), params: { eventId: 'event-1' } } as any)).rejects.toThrow(
            'Attendee does not belong to this event',
        );
    });

    it('returns scored matches above threshold', async () => {
        const attendee = fakeAttendee('a1', { skills: ['js'] });
        const candidate1 = fakeAttendee('b1', { skills: ['js', 'ts'] });
        const candidate2 = fakeAttendee('b2', { skills: ['rust'] });

        repo.getMatchableAttendee.mockResolvedValue(attendee);
        repo.getMatchPool.mockResolvedValue([candidate1, candidate2]);

        mockCalcScore.mockReturnValueOnce({ score: 80, breakdown: { skills: 0.8 } }).mockReturnValueOnce({ score: 30, breakdown: { skills: 0.3 } });

        const result = await service.handle({
            input: { attendeeId: 'a1', includeBreakdown: true },
            request: makeRequest(),
            params: { eventId: 'event-1' },
        } as any);

        expect(result.code).toBe(200);
        expect(result.data).toHaveLength(1);
        expect(result.data[0].score).toBe(80);
        expect(result.data[0].breakdown).toEqual({ skills: 0.8 });
    });

    it('excludes breakdown when not requested', async () => {
        repo.getMatchableAttendee.mockResolvedValue(fakeAttendee('a1'));
        repo.getMatchPool.mockResolvedValue([fakeAttendee('b1')]);
        mockCalcScore.mockReturnValue({ score: 90, breakdown: { skills: 0.9 } });

        const result = await service.handle({
            input: { attendeeId: 'a1', includeBreakdown: false },
            request: makeRequest(),
            params: { eventId: 'event-1' },
        } as any);

        expect(result.data[0].breakdown).toBeUndefined();
    });

    it('passes tenantId to repository calls', async () => {
        repo.getMatchableAttendee.mockResolvedValue(fakeAttendee('a1'));
        repo.getMatchPool.mockResolvedValue([]);

        await service.handle({
            input: { attendeeId: 'a1' },
            request: makeRequest(),
            params: { eventId: 'event-1' },
        } as any);

        expect(repo.getMatchableAttendee).toHaveBeenCalledWith('a1', 'tenant-1');
        expect(repo.getMatchPool).toHaveBeenCalledWith('event-1', 'tenant-1', ['a1']);
    });
});

// ─── BatchMatchEvent ────────────────────────────────────

describe('BatchMatchEvent service', () => {
    let service: BatchMatchEvent;
    let repo: ReturnType<typeof createMockRepo>;

    beforeEach(() => {
        jest.clearAllMocks();
        repo = createMockRepo();
        service = new BatchMatchEvent(repo as any);
        mockDispatch.mockResolvedValue([EVENT]);
    });

    it('throws when tenant is missing', async () => {
        await expect(service.handle({ request: { tenant: null } as any, params: { eventId: 'event-1' } } as any)).rejects.toThrow('Invalid Tenant');
    });

    it('throws when not enough attendees', async () => {
        repo.getMatchPool.mockResolvedValue([fakeAttendee('a1')]);
        await expect(service.handle({ request: makeRequest(), params: { eventId: 'event-1' } } as any)).rejects.toThrow('Not enough attendees');
    });

    it('creates job and returns ACCEPTED', async () => {
        const pool = [fakeAttendee('a1'), fakeAttendee('a2')];
        repo.getMatchPool.mockResolvedValue(pool);
        repo.createJob.mockResolvedValue({ id: 'job-1' });
        repo.deleteMatchesByEvent.mockResolvedValue(0);
        repo.createManyMatches.mockResolvedValue(1);
        repo.updateJob.mockResolvedValue({});
        mockCalcScore.mockReturnValue({ score: 80, breakdown: { skills: 0.8 } });

        const result = await service.handle({
            request: makeRequest(),
            params: { eventId: 'event-1' },
        } as any);

        expect(result.code).toBe(202);
        expect(result.data.matchingJobId).toBe('job-1');
        expect(result.data.status).toBe('queued');
    });

    it('passes tenantId to createJob', async () => {
        repo.getMatchPool.mockResolvedValue([fakeAttendee('a1'), fakeAttendee('a2')]);
        repo.createJob.mockResolvedValue({ id: 'job-2' });
        repo.deleteMatchesByEvent.mockResolvedValue(0);
        repo.updateJob.mockResolvedValue({});
        mockCalcScore.mockReturnValue({ score: 10, breakdown: {} });

        await service.handle({ request: makeRequest(), params: { eventId: 'event-1' } } as any);

        expect(repo.createJob).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenant-1', eventId: 'event-1', mode: 'batch' }));
    });
});

// ─── GetMatches ─────────────────────────────────────────

describe('GetMatches service', () => {
    let service: GetMatches;
    let repo: ReturnType<typeof createMockRepo>;

    beforeEach(() => {
        jest.clearAllMocks();
        repo = createMockRepo();
        service = new GetMatches(repo as any);
    });

    it('throws when tenant is missing', async () => {
        await expect(service.handle({ request: { tenant: null } as any, params: { eventId: 'event-1' }, query: {} } as any)).rejects.toThrow(
            'Invalid Tenant',
        );
    });

    it('throws when eventId is missing', async () => {
        await expect(service.handle({ request: makeRequest(), params: {}, query: {} } as any)).rejects.toThrow('Event ID is required');
    });

    it('calls repo.findByEvent with tenant scope', async () => {
        repo.findByEvent.mockResolvedValue([]);
        await service.handle({
            request: makeRequest(),
            params: { eventId: 'event-1' },
            query: { page: 2, pageSize: 10, attendeeId: 'a1' },
        } as any);

        expect(repo.findByEvent).toHaveBeenCalledWith('event-1', 'tenant-1', {
            attendeeId: 'a1',
            page: 2,
            pageSize: 10,
        });
    });

    it('returns data with OK status', async () => {
        repo.findByEvent.mockResolvedValue([{ id: 'm1', score: 85 }]);
        const result = await service.handle({
            request: makeRequest(),
            params: { eventId: 'event-1' },
            query: {},
        } as any);
        expect(result.code).toBe(200);
        expect(result.data).toHaveLength(1);
    });
});

// ─── GetJobStatus ───────────────────────────────────────

describe('GetJobStatus service', () => {
    let service: GetJobStatus;
    let repo: ReturnType<typeof createMockRepo>;

    beforeEach(() => {
        jest.clearAllMocks();
        repo = createMockRepo();
        service = new GetJobStatus(repo as any);
    });

    it('throws when tenant is missing', async () => {
        await expect(service.handle({ request: { tenant: null } as any, params: { eventId: 'e1', jobId: 'j1' } } as any)).rejects.toThrow(
            'Invalid Tenant',
        );
    });

    it('throws when eventId is missing', async () => {
        await expect(service.handle({ request: makeRequest(), params: { jobId: 'j1' } } as any)).rejects.toThrow('Event ID is required');
    });

    it('throws when jobId is missing', async () => {
        await expect(service.handle({ request: makeRequest(), params: { eventId: 'e1' } } as any)).rejects.toThrow('Job ID is required');
    });

    it('throws NotFoundError when job does not exist', async () => {
        repo.getJobById.mockResolvedValue(null);
        await expect(service.handle({ request: makeRequest(), params: { eventId: 'e1', jobId: 'j1' } } as any)).rejects.toThrow(
            'Matching job not found',
        );
    });

    it('throws NotFoundError when job belongs to a different event', async () => {
        repo.getJobById.mockResolvedValue({ id: 'j1', eventId: 'other-event', tenantId: 'tenant-1' });
        await expect(service.handle({ request: makeRequest(), params: { eventId: 'e1', jobId: 'j1' } } as any)).rejects.toThrow(
            'Matching job not found',
        );
    });

    it('returns job data when valid', async () => {
        const job = { id: 'j1', eventId: 'e1', tenantId: 'tenant-1', status: 'completed' };
        repo.getJobById.mockResolvedValue(job);
        const result = await service.handle({
            request: makeRequest(),
            params: { eventId: 'e1', jobId: 'j1' },
        } as any);
        expect(result.code).toBe(200);
        expect(result.data).toEqual(job);
    });

    it('passes tenantId to getJobById', async () => {
        repo.getJobById.mockResolvedValue({ id: 'j1', eventId: 'e1', tenantId: 'tenant-1' });
        await service.handle({
            request: makeRequest(),
            params: { eventId: 'e1', jobId: 'j1' },
        } as any);
        expect(repo.getJobById).toHaveBeenCalledWith('j1', 'tenant-1');
    });
});
