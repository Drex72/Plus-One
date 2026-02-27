export const eventSwaggerSpec = {
    tags: [{ name: 'Events', description: 'Event creation, management, and lifecycle operations' }],
    paths: {
        '/events': {
            post: {
                tags: ['Events'],
                summary: 'Create a new event',
                description:
                    'Create an event with a `matchingConfig` that defines how attendees are scored and matched. ' +
                    'The config includes attribute weights, constraint rules, required profile fields, and an optional threshold.\n\n' +
                    'The event is created in `draft` status by default.',
                operationId: 'createEvent',
                security: [{ ApiKeyAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/CreateEventInput' },
                            examples: {
                                networking: {
                                    summary: 'Tech networking event',
                                    value: {
                                        name: 'Tech Networking SF 2026',
                                        description: 'Connect with tech professionals in the Bay Area',
                                        matchingConfig: {
                                            matchThreshold: 65,
                                            requiredFields: ['industry', 'role', 'experience', 'interests', 'goals'],
                                            attributes: [
                                                { field: 'industry', type: 'exact', weight: 0.25, config: {} },
                                                { field: 'role', type: 'exact', weight: 0.2, config: {} },
                                                { field: 'interests', type: 'array_similarity', weight: 0.3, config: {} },
                                                {
                                                    field: 'experience',
                                                    type: 'ordinal',
                                                    weight: 0.15,
                                                    config: { scale: ['junior', 'mid', 'senior', 'executive'] },
                                                },
                                                { field: 'goals', type: 'array_similarity', weight: 0.1, config: {} },
                                            ],
                                            constraints: [],
                                        },
                                        startsAt: '2026-03-15T18:00:00.000Z',
                                        endsAt: '2026-03-15T22:00:00.000Z',
                                    },
                                },
                                speedDating: {
                                    summary: "Valentine's speed dating",
                                    value: {
                                        name: "Valentine's Speed Dating",
                                        description: 'Singles mixer for 25-35 year olds',
                                        matchingConfig: {
                                            matchThreshold: 70,
                                            requiredFields: ['age', 'gender', 'interests', 'musicTaste', 'drinkingLevel', 'fashionStyle'],
                                            attributes: [
                                                { field: 'interests', type: 'array_similarity', weight: 0.35, config: {} },
                                                { field: 'musicTaste', type: 'array_similarity', weight: 0.25, config: {} },
                                                { field: 'age', type: 'numeric', weight: 0.2, config: { maxDistance: 10 } },
                                                {
                                                    field: 'drinkingLevel',
                                                    type: 'ordinal',
                                                    weight: 0.15,
                                                    config: { scale: ['none', 'light', 'moderate', 'heavy'] },
                                                },
                                                { field: 'fashionStyle', type: 'exact', weight: 0.05, config: {} },
                                            ],
                                            constraints: [
                                                {
                                                    field: 'age',
                                                    operator: 'range',
                                                    value: [25, 35],
                                                    type: 'hard',
                                                },
                                            ],
                                        },
                                        startsAt: '2026-02-14T19:00:00.000Z',
                                        endsAt: '2026-02-14T23:00:00.000Z',
                                    },
                                },
                                cofounderMatching: {
                                    summary: 'YC cofounder matching',
                                    value: {
                                        name: 'YC Cofounder Matching',
                                        description: 'Find your technical/business cofounder',
                                        matchingConfig: {
                                            matchThreshold: 75,
                                            requiredFields: ['roleType', 'industry', 'stage', 'skills', 'lookingFor', 'location'],
                                            attributes: [
                                                { field: 'roleType', type: 'exact', weight: 0.3, config: {} },
                                                { field: 'industry', type: 'exact', weight: 0.25, config: {} },
                                                { field: 'lookingFor', type: 'array_similarity', weight: 0.2, config: {} },
                                                { field: 'skills', type: 'array_similarity', weight: 0.15, config: {} },
                                                {
                                                    field: 'stage',
                                                    type: 'ordinal',
                                                    weight: 0.1,
                                                    config: { scale: ['idea', 'mvp', 'launched', 'revenue', 'growth'] },
                                                },
                                            ],
                                            constraints: [
                                                {
                                                    field: 'roleType',
                                                    operator: 'neq',
                                                    value: { field: 'roleType' },
                                                    type: 'soft',
                                                },
                                            ],
                                        },
                                        startsAt: '2026-04-01T09:00:00.000Z',
                                        endsAt: '2026-04-01T18:00:00.000Z',
                                    },
                                },
                                houseParty: {
                                    summary: 'House party / birthday bash',
                                    value: {
                                        name: "Drexler's Birthday Bash",
                                        description: 'Vibe-based matching for a house party',
                                        matchingConfig: {
                                            matchThreshold: 55,
                                            requiredFields: ['partyVibe', 'musicTaste', 'socialEnergy', 'interests', 'age'],
                                            attributes: [
                                                { field: 'partyVibe', type: 'exact', weight: 0.2, config: {} },
                                                { field: 'musicTaste', type: 'array_similarity', weight: 0.3, config: {} },
                                                {
                                                    field: 'socialEnergy',
                                                    type: 'ordinal',
                                                    weight: 0.25,
                                                    config: { scale: ['introvert', 'ambivert', 'extrovert'] },
                                                },
                                                { field: 'interests', type: 'array_similarity', weight: 0.25, config: {} },
                                            ],
                                            constraints: [
                                                {
                                                    field: 'age',
                                                    operator: 'range',
                                                    value: [21, 40],
                                                    type: 'hard',
                                                },
                                            ],
                                        },
                                        startsAt: '2026-08-20T20:00:00.000Z',
                                        endsAt: '2026-08-21T02:00:00.000Z',
                                    },
                                },
                                corporateTeamBuilding: {
                                    summary: 'Corporate team-building retreat',
                                    value: {
                                        name: 'Q3 Cross-Team Mixer',
                                        description: 'Pair employees across departments for mentoring and collaboration',
                                        matchingConfig: {
                                            matchThreshold: 50,
                                            requiredFields: ['department', 'skills', 'seniority', 'interests', 'location'],
                                            attributes: [
                                                { field: 'department', type: 'exact', weight: 0.15, config: {} },
                                                { field: 'skills', type: 'array_similarity', weight: 0.3, config: {} },
                                                {
                                                    field: 'seniority',
                                                    type: 'ordinal',
                                                    weight: 0.2,
                                                    config: { scale: ['intern', 'junior', 'mid', 'senior', 'staff', 'director'] },
                                                },
                                                { field: 'interests', type: 'array_similarity', weight: 0.2, config: {} },
                                                { field: 'location', type: 'exact', weight: 0.15, config: {} },
                                            ],
                                            constraints: [
                                                {
                                                    field: 'department',
                                                    operator: 'neq',
                                                    value: { field: 'department' },
                                                    type: 'soft',
                                                },
                                            ],
                                        },
                                        startsAt: '2026-07-10T09:00:00.000Z',
                                        endsAt: '2026-07-10T17:00:00.000Z',
                                    },
                                },
                                musicFestival: {
                                    summary: 'Music festival meetup',
                                    value: {
                                        name: 'Afro Nation Festival Buddy Finder',
                                        description: 'Find your festival crew based on music taste and vibe',
                                        matchingConfig: {
                                            matchThreshold: 60,
                                            requiredFields: ['genres', 'artists', 'energyLevel', 'campingStyle', 'daysAttending'],
                                            attributes: [
                                                { field: 'genres', type: 'array_similarity', weight: 0.35, config: {} },
                                                { field: 'artists', type: 'array_similarity', weight: 0.25, config: {} },
                                                {
                                                    field: 'energyLevel',
                                                    type: 'ordinal',
                                                    weight: 0.2,
                                                    config: { scale: ['chill', 'moderate', 'hype', 'moshpit'] },
                                                },
                                                { field: 'campingStyle', type: 'exact', weight: 0.1, config: {} },
                                                { field: 'daysAttending', type: 'array_similarity', weight: 0.1, config: {} },
                                            ],
                                            constraints: [],
                                        },
                                        startsAt: '2026-07-04T12:00:00.000Z',
                                        endsAt: '2026-07-06T23:00:00.000Z',
                                    },
                                },
                                investorMixer: {
                                    summary: 'Startup pitch / investor mixer',
                                    value: {
                                        name: 'Lagos Angel Investor Mixer',
                                        description: 'Connect founders with angel investors and VCs in the African tech ecosystem',
                                        matchingConfig: {
                                            matchThreshold: 70,
                                            requiredFields: ['role', 'sector', 'fundingStage', 'interests', 'geography', 'expertise'],
                                            attributes: [
                                                { field: 'sector', type: 'exact', weight: 0.3, config: {} },
                                                {
                                                    field: 'fundingStage',
                                                    type: 'ordinal',
                                                    weight: 0.25,
                                                    config: { scale: ['pre-seed', 'seed', 'series-a', 'series-b', 'growth'] },
                                                },
                                                { field: 'interests', type: 'array_similarity', weight: 0.2, config: {} },
                                                { field: 'geography', type: 'exact', weight: 0.15, config: {} },
                                                { field: 'expertise', type: 'array_similarity', weight: 0.1, config: {} },
                                            ],
                                            constraints: [
                                                {
                                                    field: 'role',
                                                    operator: 'neq',
                                                    value: { field: 'role' },
                                                    type: 'hard',
                                                },
                                            ],
                                        },
                                        startsAt: '2026-05-20T17:00:00.000Z',
                                        endsAt: '2026-05-20T21:00:00.000Z',
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': {
                        description: 'Event created',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        message: { type: 'string', example: 'Event Created Successfully' },
                                        data: { $ref: '#/components/schemas/Event' },
                                    },
                                },
                                example: {
                                    message: 'Event Created Successfully',
                                    data: {
                                        id: 'b3f1a2c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c',
                                        tenantId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                                        name: 'tech networking sf 2026',
                                        description: 'Connect with tech professionals in the Bay Area',
                                        matchingConfig: {
                                            matchThreshold: 65,
                                            requiredFields: ['industry', 'role', 'experience', 'interests', 'goals'],
                                            attributes: [
                                                { field: 'industry', type: 'exact', weight: 0.25, config: {} },
                                                { field: 'role', type: 'exact', weight: 0.2, config: {} },
                                                { field: 'interests', type: 'array_similarity', weight: 0.3, config: {} },
                                                {
                                                    field: 'experience',
                                                    type: 'ordinal',
                                                    weight: 0.15,
                                                    config: { scale: ['junior', 'mid', 'senior', 'executive'] },
                                                },
                                                { field: 'goals', type: 'array_similarity', weight: 0.1, config: {} },
                                            ],
                                            constraints: [],
                                        },
                                        status: 'draft',
                                        startsAt: '2026-03-15T18:00:00.000Z',
                                        endsAt: '2026-03-15T22:00:00.000Z',
                                        createdAt: '2026-02-16T10:00:00.000Z',
                                        updatedAt: '2026-02-16T10:00:00.000Z',
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
            get: {
                tags: ['Events'],
                summary: 'List events',
                description: 'List all events for the authenticated tenant. Supports pagination and search by event name.',
                operationId: 'listEvents',
                security: [{ ApiKeyAuth: [] }],
                parameters: [
                    {
                        name: 'page',
                        in: 'query',
                        required: false,
                        description: 'Page number (1-based)',
                        schema: { type: 'integer', minimum: 1, default: 1, example: 1 },
                    },
                    {
                        name: 'pageSize',
                        in: 'query',
                        required: false,
                        description: 'Number of items per page (max 100)',
                        schema: { type: 'integer', minimum: 1, maximum: 100, default: 10, example: 10 },
                    },
                    {
                        name: 'search',
                        in: 'query',
                        required: false,
                        description: 'Search events by name',
                        schema: { type: 'string', maxLength: 100, example: 'tech connect' },
                    },
                ],
                responses: {
                    '200': {
                        description: 'Paginated list of events',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        message: { type: 'string', example: 'Events Fetched Successfully' },
                                        data: {
                                            type: 'array',
                                            items: { $ref: '#/components/schemas/Event' },
                                        },
                                    },
                                },
                                example: {
                                    message: 'Events Fetched Successfully',
                                    data: [
                                        {
                                            id: 'b3f1a2c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c',
                                            tenantId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                                            name: 'tech networking sf 2026',
                                            description: 'Connect with tech professionals in the Bay Area',
                                            matchingConfig: {
                                                matchThreshold: 65,
                                                requiredFields: ['industry', 'role', 'experience', 'interests', 'goals'],
                                                attributes: [
                                                    { field: 'industry', type: 'exact', weight: 0.25, config: {} },
                                                    { field: 'role', type: 'exact', weight: 0.2, config: {} },
                                                ],
                                                constraints: [],
                                            },
                                            status: 'active',
                                            startsAt: '2026-03-15T18:00:00.000Z',
                                            endsAt: '2026-03-15T22:00:00.000Z',
                                            createdAt: '2026-02-16T10:00:00.000Z',
                                            updatedAt: '2026-02-16T12:00:00.000Z',
                                        },
                                        {
                                            id: 'e7f8a9b0-c1d2-3e4f-5a6b-7c8d9e0f1a2b',
                                            tenantId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                                            name: "valentine's speed dating",
                                            description: 'Singles mixer for 25-35 year olds',
                                            matchingConfig: {
                                                matchThreshold: 70,
                                                requiredFields: ['age', 'gender', 'interests', 'musicTaste', 'drinkingLevel', 'fashionStyle'],
                                                attributes: [
                                                    { field: 'interests', type: 'array_similarity', weight: 0.35, config: {} },
                                                    { field: 'musicTaste', type: 'array_similarity', weight: 0.25, config: {} },
                                                ],
                                                constraints: [{ field: 'age', operator: 'range', value: [25, 35], type: 'hard' }],
                                            },
                                            status: 'draft',
                                            startsAt: '2026-02-14T19:00:00.000Z',
                                            endsAt: '2026-02-14T23:00:00.000Z',
                                            createdAt: '2026-02-10T08:00:00.000Z',
                                            updatedAt: '2026-02-10T08:00:00.000Z',
                                        },
                                    ],
                                },
                            },
                        },
                    },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '500': { $ref: '#/components/responses/InternalError' },
                },
            },
        },

        '/events/{eventId}': {
            get: {
                tags: ['Events'],
                summary: 'Get event by ID',
                description: 'Retrieve a single event by its UUID, including its full matching configuration.',
                operationId: 'getEvent',
                security: [{ ApiKeyAuth: [] }],
                parameters: [
                    {
                        name: 'eventId',
                        in: 'path',
                        required: true,
                        description: 'UUID of the event',
                        schema: { type: 'string', format: 'uuid', example: 'b3f1a2c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c' },
                    },
                ],
                responses: {
                    '200': {
                        description: 'Event details',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        message: { type: 'string', example: 'Event Fetched Successfully' },
                                        data: { $ref: '#/components/schemas/Event' },
                                    },
                                },
                                example: {
                                    message: 'Event Fetched Successfully',
                                    data: {
                                        id: 'b3f1a2c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c',
                                        tenantId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                                        name: 'yc cofounder matching',
                                        description: 'Find your technical/business cofounder',
                                        matchingConfig: {
                                            matchThreshold: 75,
                                            requiredFields: ['roleType', 'industry', 'stage', 'skills', 'lookingFor', 'location'],
                                            attributes: [
                                                { field: 'roleType', type: 'exact', weight: 0.3, config: {} },
                                                { field: 'industry', type: 'exact', weight: 0.25, config: {} },
                                                { field: 'lookingFor', type: 'array_similarity', weight: 0.2, config: {} },
                                                { field: 'skills', type: 'array_similarity', weight: 0.15, config: {} },
                                                {
                                                    field: 'stage',
                                                    type: 'ordinal',
                                                    weight: 0.1,
                                                    config: { scale: ['idea', 'mvp', 'launched', 'revenue', 'growth'] },
                                                },
                                            ],
                                            constraints: [{ field: 'roleType', operator: 'neq', value: { field: 'roleType' }, type: 'soft' }],
                                        },
                                        status: 'active',
                                        startsAt: '2026-04-01T09:00:00.000Z',
                                        endsAt: '2026-04-01T18:00:00.000Z',
                                        createdAt: '2026-02-16T10:00:00.000Z',
                                        updatedAt: '2026-02-16T12:00:00.000Z',
                                    },
                                },
                            },
                        },
                    },
                    '400': {
                        description: 'Event not found',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                                example: { error: 'Event not found' },
                            },
                        },
                    },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '500': { $ref: '#/components/responses/InternalError' },
                },
            },
            patch: {
                tags: ['Events'],
                summary: 'Update event',
                description:
                    "Update an event's name, description, matching config, status, or schedule. " +
                    'Partial updates are supported — only include fields you want to change.',
                operationId: 'updateEvent',
                security: [{ ApiKeyAuth: [] }],
                parameters: [
                    {
                        name: 'eventId',
                        in: 'path',
                        required: true,
                        description: 'UUID of the event to update',
                        schema: { type: 'string', format: 'uuid', example: 'b3f1a2c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c' },
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/UpdateEventInput' },
                            examples: {
                                activateEvent: {
                                    summary: 'Activate an event',
                                    value: { status: 'active' },
                                },
                                updateConfig: {
                                    summary: 'Adjust matching threshold and attributes',
                                    value: {
                                        matchingConfig: {
                                            matchThreshold: 70,
                                            requiredFields: ['industry', 'role', 'experience', 'interests', 'goals'],
                                            attributes: [
                                                { field: 'industry', type: 'exact', weight: 0.3, config: {} },
                                                { field: 'role', type: 'exact', weight: 0.2, config: {} },
                                                { field: 'interests', type: 'array_similarity', weight: 0.3, config: {} },
                                                {
                                                    field: 'experience',
                                                    type: 'ordinal',
                                                    weight: 0.1,
                                                    config: { scale: ['junior', 'mid', 'senior', 'executive'] },
                                                },
                                                { field: 'goals', type: 'array_similarity', weight: 0.1, config: {} },
                                            ],
                                            constraints: [],
                                        },
                                    },
                                },
                                updateDetails: {
                                    summary: 'Update name and schedule',
                                    value: {
                                        name: 'Tech Networking SF 2026 — Extended',
                                        description: 'Now a two-day event with more tracks',
                                        startsAt: '2026-03-15T10:00:00.000Z',
                                        endsAt: '2026-03-16T18:00:00.000Z',
                                    },
                                },
                                archiveEvent: {
                                    summary: 'Archive a completed event',
                                    value: { status: 'archived' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Event updated',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        message: { type: 'string', example: 'Event Updated Successfully' },
                                        data: { $ref: '#/components/schemas/Event' },
                                    },
                                },
                                example: {
                                    message: 'Event Updated Successfully',
                                    data: {
                                        id: 'b3f1a2c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c',
                                        tenantId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                                        name: 'tech networking sf 2026 — extended',
                                        description: 'Now a two-day event with more tracks',
                                        matchingConfig: {
                                            matchThreshold: 70,
                                            requiredFields: ['industry', 'role', 'experience', 'interests', 'goals'],
                                            attributes: [
                                                { field: 'industry', type: 'exact', weight: 0.3, config: {} },
                                                { field: 'role', type: 'exact', weight: 0.2, config: {} },
                                                { field: 'interests', type: 'array_similarity', weight: 0.3, config: {} },
                                            ],
                                            constraints: [],
                                        },
                                        status: 'active',
                                        startsAt: '2026-03-15T10:00:00.000Z',
                                        endsAt: '2026-03-16T18:00:00.000Z',
                                        createdAt: '2026-02-16T10:00:00.000Z',
                                        updatedAt: '2026-02-16T14:30:00.000Z',
                                    },
                                },
                            },
                        },
                    },
                    '400': {
                        description: 'Event not found',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                                example: { error: 'Event not found' },
                            },
                        },
                    },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '500': { $ref: '#/components/responses/InternalError' },
                },
            },
        },
    },

    components: {
        schemas: {
            MatchingConfig: {
                type: 'object',
                required: ['requiredFields', 'attributes'],
                description:
                    'Defines how attendees are scored and matched for this event. ' +
                    'This is the core extensibility point — you define attribute scoring rules, constraints, required profile fields, and thresholds.',
                properties: {
                    matchThreshold: {
                        type: 'number',
                        minimum: 0,
                        maximum: 100,
                        description: 'Minimum score (0–100) for a valid match. Optional — if omitted, all scored pairs are returned.',
                        example: 65,
                    },
                    requiredFields: {
                        type: 'array',
                        items: { type: 'string' },
                        minItems: 1,
                        description:
                            'Profile field names that attendees MUST provide when registering. ' +
                            'All attribute `field` and constraint `field` values must reference fields in this list.',
                        example: ['industry', 'role', 'experience', 'interests', 'goals'],
                    },
                    attributes: {
                        type: 'array',
                        minItems: 1,
                        description: 'Attribute scoring rules — each defines how one attendee profile field is compared and weighted.',
                        items: {
                            type: 'object',
                            required: ['field', 'type', 'weight'],
                            properties: {
                                field: {
                                    type: 'string',
                                    description: "Attribute key in the attendee's profile object. Must be listed in `requiredFields`.",
                                    example: 'industry',
                                },
                                type: {
                                    type: 'string',
                                    enum: ['exact', 'array_similarity', 'ordinal', 'numeric'],
                                    description:
                                        'Scoring function: `exact` (1 or 0), `array_similarity` (Jaccard index), ' +
                                        '`ordinal` (scale distance), `numeric` (normalized numeric distance)',
                                },
                                weight: {
                                    type: 'number',
                                    minimum: 0,
                                    maximum: 1,
                                    description: 'Weight for this attribute (all weights should sum to ~1.0)',
                                    example: 0.25,
                                },
                                config: {
                                    type: 'object',
                                    description:
                                        'Type-specific configuration. Required for `ordinal` (needs `scale`) and `numeric` (needs `maxDistance`). ' +
                                        'Can be an empty object `{}` for `exact` and `array_similarity`.',
                                    properties: {
                                        scale: {
                                            type: 'array',
                                            items: { type: 'string' },
                                            minItems: 2,
                                            description: 'Ordered scale for ordinal attributes (required when type is `ordinal`)',
                                            example: ['junior', 'mid', 'senior', 'executive'],
                                        },
                                        maxDistance: {
                                            type: 'number',
                                            description: 'Maximum distance for numeric scoring normalization (required when type is `numeric`)',
                                            example: 10,
                                        },
                                    },
                                },
                            },
                        },
                    },
                    constraints: {
                        type: 'array',
                        default: [],
                        description: 'Hard/soft constraint rules evaluated bidirectionally between attendee pairs. Defaults to empty array.',
                        items: {
                            type: 'object',
                            required: ['field', 'operator', 'value', 'type'],
                            properties: {
                                field: {
                                    type: 'string',
                                    description: 'Profile field name to constrain. Must be listed in `requiredFields`.',
                                    example: 'age',
                                },
                                operator: {
                                    type: 'string',
                                    enum: ['eq', 'neq', 'in', 'not_in', 'range', 'gte', 'lte'],
                                    description: 'Comparison operator',
                                },
                                value: {
                                    description:
                                        'Constraint value — can be a literal, an array, or a dynamic reference object like `{ field: "roleType" }`',
                                },
                                type: {
                                    type: 'string',
                                    enum: ['hard', 'soft'],
                                    description: 'Hard = reject pair on failure. Soft = apply penalty multiplier.',
                                },
                            },
                        },
                    },
                },
            },

            CreateEventInput: {
                type: 'object',
                required: ['name'],
                properties: {
                    name: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 255,
                        description: 'Event name',
                        example: 'Tech Networking SF 2026',
                    },
                    description: {
                        type: 'string',
                        maxLength: 2000,
                        nullable: true,
                        description: 'Event description',
                        example: 'Connect with tech professionals in the Bay Area',
                    },
                    matchingConfig: {
                        $ref: '#/components/schemas/MatchingConfig',
                    },
                    startsAt: {
                        type: 'string',
                        format: 'date-time',
                        nullable: true,
                        description: 'Event start time (ISO 8601)',
                        example: '2026-03-15T18:00:00.000Z',
                    },
                    endsAt: {
                        type: 'string',
                        format: 'date-time',
                        nullable: true,
                        description: 'Event end time (ISO 8601)',
                        example: '2026-03-15T22:00:00.000Z',
                    },
                },
            },

            UpdateEventInput: {
                type: 'object',
                description: 'Partial update — only include fields you want to change. At least one field is required.',
                properties: {
                    name: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 255,
                        description: 'Updated event name',
                        example: 'Tech Networking SF 2026 — Extended',
                    },
                    description: {
                        type: 'string',
                        maxLength: 2000,
                        nullable: true,
                        description: 'Updated event description',
                    },
                    matchingConfig: {
                        $ref: '#/components/schemas/MatchingConfig',
                    },
                    status: {
                        type: 'string',
                        enum: ['draft', 'active', 'matching', 'completed', 'archived'],
                        description: 'Event lifecycle status',
                        example: 'active',
                    },
                    startsAt: {
                        type: 'string',
                        format: 'date-time',
                        nullable: true,
                        description: 'Updated start time (ISO 8601)',
                    },
                    endsAt: {
                        type: 'string',
                        format: 'date-time',
                        nullable: true,
                        description: 'Updated end time (ISO 8601)',
                    },
                },
            },

            Event: {
                type: 'object',
                description: 'An event with its matching configuration and lifecycle metadata.',
                properties: {
                    id: {
                        type: 'string',
                        format: 'uuid',
                        description: 'Unique event identifier',
                        example: 'b3f1a2c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c',
                    },
                    tenantId: {
                        type: 'string',
                        format: 'uuid',
                        description: 'ID of the tenant that owns this event',
                        example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                    },
                    name: {
                        type: 'string',
                        description: 'Event name (stored lowercase)',
                        example: 'tech networking sf 2026',
                    },
                    description: {
                        type: 'string',
                        nullable: true,
                        description: 'Event description',
                        example: 'Connect with tech professionals in the Bay Area',
                    },
                    matchingConfig: {
                        $ref: '#/components/schemas/MatchingConfig',
                    },
                    status: {
                        type: 'string',
                        enum: ['draft', 'active', 'matching', 'completed', 'archived'],
                        description:
                            'Event lifecycle status: `draft` (configuring), `active` (accepting attendees), ' +
                            '`matching` (batch matching in progress), `completed` (matching done), `archived` (closed)',
                        example: 'draft',
                    },
                    startsAt: {
                        type: 'string',
                        format: 'date-time',
                        nullable: true,
                        description: 'Event start time',
                        example: '2026-03-15T18:00:00.000Z',
                    },
                    endsAt: {
                        type: 'string',
                        format: 'date-time',
                        nullable: true,
                        description: 'Event end time',
                        example: '2026-03-15T22:00:00.000Z',
                    },
                    createdAt: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Record creation timestamp',
                        example: '2026-02-16T10:00:00.000Z',
                    },
                    updatedAt: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Record last-update timestamp',
                        example: '2026-02-16T12:00:00.000Z',
                    },
                },
            },
        },
    },
};
