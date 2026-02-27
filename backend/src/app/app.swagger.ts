/**
 * OpenAPI 3.0 specification for the Multi-Tenant Matching API.
 *
 * Each module exports its own swagger spec which is merged here.
 */

import { config } from '@/core';
import { attendeeSwaggerSpec } from '~/attendees/swagger';
import { eventSwaggerSpec } from '~/events/swagger';
import { tenantSwaggerSpec } from '~/tenants/swagger';

export const swaggerSpec = {
    openapi: '3.0.3',
    info: {
        title: 'Plus One — Multi-Tenant Attendee Matching API',
        version: '1.0.0',
        description:
            'A scalable, multi-tenant matching platform that pairs attendees at events (networking, parties, startup mixers, conferences) based on configurable attributes, constraints, and scoring strategies.\n\n' +
            '## Authentication\n' +
            'All endpoints (except `POST /tenants` and `/health`) require an `X-API-Key` header. ' +
            'You receive your API key when creating a tenant.\n\n' +
            '## Matching Flow\n' +
            '1. Create a **tenant** → get your API key\n' +
            '2. Create an **event** with a `matching_config`\n' +
            '3. Register **attendees** (each triggers incremental matching automatically)\n' +
            '4. Optionally trigger **batch matching** via `POST /matching/:eventId/match`\n' +
            '5. Poll job status via `GET /matching/:eventId/match/jobs/:jobId`\n' +
            '6. Retrieve **matches** via `GET /matching/:eventId/matches`',
        contact: {
            name: 'Plus One Team',
        },
        license: {
            name: 'MIT',
        },
    },
    servers: [
        {
            url: `http://localhost:${config.port}/api/v1`,
            description: 'Local development',
        },
    ],
    tags: [...tenantSwaggerSpec.tags, ...eventSwaggerSpec.tags, ...attendeeSwaggerSpec.tags],
    paths: {
        '/health': {
            get: {
                tags: ['Health'],
                summary: 'Health check',
                description: 'Returns service status. No authentication required.',
                operationId: 'getHealth',
                responses: {
                    '200': {
                        description: 'Service is healthy',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: { type: 'string', example: 'ok' },
                                        timestamp: {
                                            type: 'string',
                                            format: 'date-time',
                                            example: '2026-02-13T10:00:00.000Z',
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        ...tenantSwaggerSpec.paths,
        ...eventSwaggerSpec.paths,
        ...attendeeSwaggerSpec.paths,

        // ─── Matching Endpoints (mounted under /matching) ───

        '/matching/{eventId}/match': {
            post: {
                tags: ['Matching'],
                summary: 'Trigger batch matching',
                description:
                    'Trigger a full batch matching job for an event. Scores **all pairs** of attendees in the pool ' +
                    "using the event's matching config and writes matches that exceed the threshold.\n\n" +
                    'Previous matches for this event are deleted before inserting new results (idempotent).\n\n' +
                    'This is an async operation — the job is queued and processed in the background. ' +
                    'Use the returned `matchingJobId` to poll for status via `GET /matching/{eventId}/match/jobs/{jobId}`.\n\n' +
                    '**Complexity:** O(n²) pairwise scoring, capped by `MAX_BATCH_SIZE`.',
                operationId: 'triggerBatchMatch',
                security: [{ ApiKeyAuth: [] }],
                parameters: [{ $ref: '#/components/parameters/EventIdParam' }],
                responses: {
                    '202': {
                        description: 'Batch matching job queued',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        data: {
                                            type: 'object',
                                            properties: {
                                                matchingJobId: {
                                                    type: 'string',
                                                    format: 'uuid',
                                                    description: 'ID of the queued batch matching job',
                                                },
                                                status: {
                                                    type: 'string',
                                                    enum: ['queued'],
                                                    example: 'queued',
                                                },
                                            },
                                        },
                                        message: { type: 'string', example: 'Batch matching job queued' },
                                    },
                                },
                            },
                        },
                    },
                    '400': { $ref: '#/components/responses/BadRequest' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '500': { $ref: '#/components/responses/InternalError' },
                },
            },
        },

        '/matching/{eventId}/match/find': {
            post: {
                tags: ['Matching'],
                summary: 'Find matches for a specific attendee',
                description:
                    'Find the best real-time matches for a specific attendee within an event. ' +
                    'Scores the attendee against all eligible candidates in the pool, filters by threshold, ' +
                    'and returns the top N matches sorted by score descending.\n\n' +
                    'Results are **not** persisted — this is a read-only scoring operation.',
                operationId: 'findMatches',
                security: [{ ApiKeyAuth: [] }],
                parameters: [{ $ref: '#/components/parameters/EventIdParam' }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['attendeeId'],
                                properties: {
                                    attendeeId: {
                                        type: 'string',
                                        format: 'uuid',
                                        description: 'The attendee to find matches for',
                                    },
                                    limit: {
                                        type: 'integer',
                                        minimum: 1,
                                        maximum: 100,
                                        default: 20,
                                        description: 'Maximum number of matches to return',
                                    },
                                    includeBreakdown: {
                                        type: 'boolean',
                                        default: false,
                                        description: 'Include per-attribute score breakdown in results',
                                    },
                                    excludeIds: {
                                        type: 'array',
                                        items: { type: 'string', format: 'uuid' },
                                        description: 'Attendee IDs to exclude from matching',
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Matches found',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        data: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    attendee: { $ref: '#/components/schemas/MatchableAttendee' },
                                                    score: { type: 'integer', minimum: 0, maximum: 100 },
                                                    breakdown: {
                                                        type: 'object',
                                                        additionalProperties: { type: 'number' },
                                                    },
                                                },
                                            },
                                        },
                                        message: { type: 'string', example: 'Matches Found Successfully' },
                                    },
                                },
                            },
                        },
                    },
                    '400': { $ref: '#/components/responses/BadRequest' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '500': { $ref: '#/components/responses/InternalError' },
                },
            },
        },

        '/matching/{eventId}/matches': {
            get: {
                tags: ['Matching'],
                summary: 'Get matches for event',
                description:
                    'Retrieve all stored matches for an event, sorted by score descending. ' +
                    'Each match includes the pair of attendee IDs, the overall score (0–100), ' +
                    "and a breakdown showing each attribute's contribution.\n\n" +
                    'Supports pagination via `page` and `pageSize` query parameters, and optional filtering by `attendeeId`.',
                operationId: 'getMatches',
                security: [{ ApiKeyAuth: [] }],
                parameters: [
                    { $ref: '#/components/parameters/EventIdParam' },
                    {
                        name: 'page',
                        in: 'query',
                        required: false,
                        description: 'Page number (1-based)',
                        schema: { type: 'integer', default: 1, minimum: 1 },
                    },
                    {
                        name: 'pageSize',
                        in: 'query',
                        required: false,
                        description: 'Number of items per page',
                        schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
                    },
                    {
                        name: 'attendeeId',
                        in: 'query',
                        required: false,
                        description: 'Filter matches involving this attendee',
                        schema: { type: 'string', format: 'uuid' },
                    },
                ],
                responses: {
                    '200': {
                        description: 'Paginated list of matches',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        data: {
                                            type: 'array',
                                            items: { $ref: '#/components/schemas/Match' },
                                        },
                                        message: { type: 'string', example: 'Matches Fetched Successfully' },
                                    },
                                },
                            },
                        },
                    },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '500': { $ref: '#/components/responses/InternalError' },
                },
            },
        },

        '/matching/{eventId}/match/jobs/{jobId}': {
            get: {
                tags: ['Matching'],
                summary: 'Get batch matching job status',
                description:
                    'Retrieve the status and result summary of a batch matching job. ' +
                    'Use this to poll for completion after triggering a batch match.',
                operationId: 'getJobStatus',
                security: [{ ApiKeyAuth: [] }],
                parameters: [
                    { $ref: '#/components/parameters/EventIdParam' },
                    {
                        name: 'jobId',
                        in: 'path',
                        required: true,
                        description: 'UUID of the matching job',
                        schema: { type: 'string', format: 'uuid' },
                    },
                ],
                responses: {
                    '200': {
                        description: 'Matching job details',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        data: { $ref: '#/components/schemas/MatchingJob' },
                                        message: { type: 'string', example: 'Matching job fetched successfully' },
                                    },
                                },
                            },
                        },
                    },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '404': { $ref: '#/components/responses/NotFound' },
                    '500': { $ref: '#/components/responses/InternalError' },
                },
            },
        },
    },

    components: {
        securitySchemes: {
            ApiKeyAuth: {
                type: 'apiKey' as const,
                in: 'header' as const,
                name: 'X-API-Key',
                description:
                    'API key received when creating a tenant via `POST /tenants`. ' +
                    'Include as the `X-API-Key` header on all authenticated requests.',
            },
        },

        parameters: {
            EventIdParam: {
                name: 'eventId',
                in: 'path',
                required: true,
                description: 'UUID of the event',
                schema: { type: 'string', format: 'uuid' },
            },
            LimitParam: {
                name: 'limit',
                in: 'query',
                required: false,
                description: 'Number of items per page',
                schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
            },
            OffsetParam: {
                name: 'offset',
                in: 'query',
                required: false,
                description: 'Number of items to skip',
                schema: { type: 'integer', default: 0, minimum: 0 },
            },
        },

        responses: {
            BadRequest: {
                description: 'Invalid request body or missing required fields',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/Error' },
                        example: { error: 'name is required' },
                    },
                },
            },
            Unauthorized: {
                description: 'Missing or invalid API key',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/Error' },
                        example: { error: 'Missing X-API-Key header' },
                    },
                },
            },
            NotFound: {
                description: 'Resource not found',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/Error' },
                        example: { error: 'Event not found' },
                    },
                },
            },
            InternalError: {
                description: 'Internal server error',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/Error' },
                        example: { error: 'Internal server error' },
                    },
                },
            },
        },

        schemas: {
            Error: {
                type: 'object',
                properties: {
                    error: { type: 'string' },
                },
                required: ['error'],
            },

            ...tenantSwaggerSpec.components.schemas,
            ...eventSwaggerSpec.components.schemas,
            ...attendeeSwaggerSpec.components.schemas,

            // ─── Match ─────────────────────────────────
            Match: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    eventId: { type: 'string', format: 'uuid' },
                    tenantId: { type: 'string', format: 'uuid' },
                    attendeeAId: { type: 'string', format: 'uuid' },
                    attendeeBId: { type: 'string', format: 'uuid' },
                    score: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 100,
                        description: 'Overall match score (0–100)',
                        example: 83,
                    },
                    scoreBreakdown: {
                        type: 'object',
                        additionalProperties: { type: 'number' },
                        description: "Per-attribute similarity score (0–1). Keys match the attribute names from the event's matching config.",
                        example: {
                            industry: 1.0,
                            role: 1.0,
                            interests: 0.75,
                            skills: 0.6,
                            experienceLevel: 0.75,
                            goals: 0.67,
                        },
                    },
                    strategy: {
                        type: 'string',
                        description: 'Which matching strategy produced this result',
                        example: 'batch_scoring',
                    },
                    status: {
                        type: 'string',
                        enum: ['pending', 'confirmed', 'rejected', 'expired'],
                    },
                    metadata: { type: 'object', additionalProperties: true },
                    createdAt: { type: 'string', format: 'date-time' },
                },
            },

            // ─── MatchableAttendee ─────────────────────
            MatchableAttendee: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    eventId: { type: 'string', format: 'uuid' },
                    tenantId: { type: 'string', format: 'uuid' },
                    name: { type: 'string' },
                    profile: {
                        type: 'object',
                        additionalProperties: true,
                        description: 'Attendee profile attributes used for matching',
                    },
                    preferences: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                field: { type: 'string' },
                                value: { type: 'array', items: {} },
                                type: { type: 'string', enum: ['in', 'range'] },
                            },
                        },
                    },
                    status: { type: 'string' },
                },
            },

            // ─── MatchingJob ───────────────────────────
            MatchingJob: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    eventId: { type: 'string', format: 'uuid' },
                    tenantId: { type: 'string', format: 'uuid' },
                    triggerAttendeeId: { type: 'string', format: 'uuid', nullable: true },
                    mode: { type: 'string', example: 'batch' },
                    status: {
                        type: 'string',
                        enum: ['queued', 'processing', 'completed', 'failed'],
                    },
                    startedAt: { type: 'string', format: 'date-time', nullable: true },
                    completedAt: { type: 'string', format: 'date-time', nullable: true },
                    error: { type: 'string', nullable: true },
                    resultSummary: {
                        type: 'object',
                        nullable: true,
                        additionalProperties: true,
                        description: 'Summary statistics of the completed job',
                        example: {
                            totalAttendees: 50,
                            totalPairsScored: 1225,
                            matchesFound: 87,
                            matchesStored: 87,
                            threshold: 60,
                            elapsedMs: 1523,
                        },
                    },
                    createdAt: { type: 'string', format: 'date-time' },
                },
            },
        },
    },
};
