export const attendeeSwaggerSpec = {
    tags: [{ name: 'Attendees', description: 'Attendee registration and listing for events' }],
    paths: {
        '/attendees/{eventId}': {
            post: {
                tags: ['Attendees'],
                summary: 'Register an attendee',
                description:
                    "Register an attendee for an event. The attendee is validated against the event's " +
                    '`requiredFields` configuration and added to the matching pool with status `in_pool`.\n\n' +
                    'The event must be in `active` status to accept registrations.',
                operationId: 'registerAttendee',
                security: [{ ApiKeyAuth: [] }],
                parameters: [
                    {
                        name: 'eventId',
                        in: 'path',
                        required: true,
                        description: 'UUID of the event to register the attendee for',
                        schema: { type: 'string', format: 'uuid', example: 'b3f1a2c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c' },
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/CreateAttendeeInput' },
                            examples: {
                                // ── Networking attendees (3) ──
                                networkingEngineer: {
                                    summary: 'Senior engineer — networking event (no preferences)',
                                    value: {
                                        name: 'Alice Chen',
                                        email: 'alice@example.com',
                                        externalId: 'user_123',
                                        profile: {
                                            industry: 'tech',
                                            role: 'engineer',
                                            experience: 'senior',
                                            interests: ['ai', 'web3', 'startups'],
                                            goals: ['find_cofounders', 'learn'],
                                        },
                                    },
                                },
                                networkingDesigner: {
                                    summary: 'Mid-level designer with experience & industry preferences',
                                    value: {
                                        name: 'Bob Smith',
                                        email: 'bob@example.com',
                                        externalId: 'user_456',
                                        profile: {
                                            industry: 'tech',
                                            role: 'designer',
                                            experience: 'mid',
                                            interests: ['design', 'ai', 'saas'],
                                            goals: ['networking', 'find_job'],
                                        },
                                        preferences: [
                                            { field: 'experience', value: ['senior', 'executive'], type: 'in' },
                                            { field: 'industry', value: ['tech', 'finance'], type: 'in' },
                                        ],
                                    },
                                },
                                networkingExecutive: {
                                    summary: 'Finance executive — mentorship & investing goals',
                                    value: {
                                        name: 'Carol Wang',
                                        email: 'carol@example.com',
                                        externalId: 'user_789',
                                        profile: {
                                            industry: 'finance',
                                            role: 'pm',
                                            experience: 'executive',
                                            interests: ['fintech', 'web3'],
                                            goals: ['mentorship', 'investing'],
                                        },
                                        preferences: [{ field: 'role', value: ['engineer', 'designer', 'pm'], type: 'in' }],
                                    },
                                },

                                // ── Dating attendees (3) ──
                                datingMale: {
                                    summary: 'Speed dating — male, 28, prefers females 25-32',
                                    value: {
                                        name: 'David Lee',
                                        email: 'david@example.com',
                                        externalId: 'dating_user_001',
                                        profile: {
                                            age: 28,
                                            gender: 'male',
                                            interests: ['hiking', 'cooking', 'travel'],
                                            musicTaste: ['indie', 'rock', 'electronic'],
                                            drinkingLevel: 'moderate',
                                            fashionStyle: 'casual',
                                        },
                                        preferences: [
                                            { field: 'gender', value: ['female'], type: 'in' },
                                            { field: 'age', value: [25, 32], type: 'range' },
                                        ],
                                    },
                                },
                                datingFemale: {
                                    summary: 'Speed dating — female, 26, prefers alt fashion styles',
                                    value: {
                                        name: 'Emma Rodriguez',
                                        email: 'emma@example.com',
                                        externalId: 'dating_user_002',
                                        profile: {
                                            age: 26,
                                            gender: 'female',
                                            interests: ['art', 'music', 'yoga'],
                                            musicTaste: ['indie', 'folk', 'jazz'],
                                            drinkingLevel: 'light',
                                            fashionStyle: 'alte',
                                        },
                                        preferences: [
                                            { field: 'gender', value: ['male', 'non-binary'], type: 'in' },
                                            { field: 'fashionStyle', value: ['alte', 'gothic', 'vintage'], type: 'in' },
                                            { field: 'age', value: [24, 30], type: 'range' },
                                        ],
                                    },
                                },
                                datingNonBinary: {
                                    summary: 'Speed dating — non-binary, 29, prefers light-moderate drinkers',
                                    value: {
                                        name: 'Jordan Taylor',
                                        email: 'jordan@example.com',
                                        externalId: 'dating_user_003',
                                        profile: {
                                            age: 29,
                                            gender: 'non-binary',
                                            interests: ['gaming', 'music', 'tech'],
                                            musicTaste: ['electronic', 'pop', 'indie'],
                                            drinkingLevel: 'moderate',
                                            fashionStyle: 'streetwear',
                                        },
                                        preferences: [
                                            { field: 'gender', value: ['female', 'non-binary'], type: 'in' },
                                            { field: 'drinkingLevel', value: ['light', 'moderate'], type: 'in' },
                                        ],
                                    },
                                },

                                // ── Cofounder attendees (3) ──
                                cofounderTechnical: {
                                    summary: 'Technical cofounder — SaaS, MVP stage, seeking business partner',
                                    value: {
                                        name: 'Michael Chang',
                                        email: 'michael@example.com',
                                        externalId: 'founder_001',
                                        profile: {
                                            roleType: 'technical',
                                            industry: 'saas',
                                            stage: 'mvp',
                                            skills: ['react', 'python', 'aws', 'machine-learning'],
                                            lookingFor: ['business', 'sales', 'marketing'],
                                            location: 'San Francisco',
                                        },
                                        preferences: [
                                            { field: 'roleType', value: ['business'], type: 'in' },
                                            { field: 'stage', value: ['idea', 'mvp', 'launched'], type: 'in' },
                                            { field: 'location', value: ['San Francisco', 'Bay Area', 'Remote'], type: 'in' },
                                        ],
                                    },
                                },
                                cofounderBusiness: {
                                    summary: 'Business cofounder — fintech, idea stage, seeking CTO',
                                    value: {
                                        name: 'Sarah Kim',
                                        email: 'sarah@example.com',
                                        externalId: 'founder_002',
                                        profile: {
                                            roleType: 'business',
                                            industry: 'fintech',
                                            stage: 'idea',
                                            skills: ['sales', 'fundraising', 'strategy', 'finance'],
                                            lookingFor: ['technical', 'engineering', 'cto'],
                                            location: 'New York',
                                        },
                                        preferences: [
                                            { field: 'roleType', value: ['technical', 'design'], type: 'in' },
                                            { field: 'industry', value: ['fintech', 'saas', 'blockchain'], type: 'in' },
                                        ],
                                    },
                                },
                                cofounderDesign: {
                                    summary: 'Design cofounder — consumer, launched, remote-first',
                                    value: {
                                        name: 'Alex Rivera',
                                        email: 'alex@example.com',
                                        externalId: 'founder_003',
                                        profile: {
                                            roleType: 'design',
                                            industry: 'consumer',
                                            stage: 'launched',
                                            skills: ['ui-ux', 'figma', 'user-research', 'branding'],
                                            lookingFor: ['technical', 'business'],
                                            location: 'Remote',
                                        },
                                        preferences: [{ field: 'stage', value: ['mvp', 'launched', 'revenue'], type: 'in' }],
                                    },
                                },

                                // ── Party attendee (1) ──
                                partyAttendee: {
                                    summary: 'House party — energetic, afrobeats fan, with gender & age prefs',
                                    value: {
                                        name: 'Dayo Afolabi',
                                        email: 'dayo@gmail.com',
                                        profile: {
                                            age: 27,
                                            gender: 'male',
                                            partyVibe: 'energetic',
                                            musicTaste: ['afrobeats', 'amapiano', 'hiphop'],
                                            socialEnergy: 'extrovert',
                                            drinkingLevel: 'moderate',
                                        },
                                        preferences: [
                                            { field: 'gender', value: ['female', 'non-binary'], type: 'in' },
                                            { field: 'age', value: [23, 32], type: 'range' },
                                        ],
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': {
                        description: 'Attendee registered successfully and added to matching pool',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        message: { type: 'string', example: 'Attendee Registered Successfully' },
                                        data: { $ref: '#/components/schemas/Event' },
                                    },
                                },
                                example: {
                                    message: 'Attendee Registered Successfully',
                                    data: {
                                        id: 'b3f1a2c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c',
                                        tenantId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                                        name: 'Tech Networking SF 2026',
                                        description: 'Connect with tech professionals in the Bay Area',
                                        matchingConfig: {
                                            matchThreshold: 65,
                                            requiredFields: ['industry', 'role', 'experience', 'interests', 'goals'],
                                            attributes: [
                                                { field: 'industry', type: 'exact', weight: 0.25, config: {} },
                                                { field: 'role', type: 'exact', weight: 0.2, config: {} },
                                                {
                                                    field: 'experience',
                                                    type: 'ordinal',
                                                    weight: 0.15,
                                                    config: { scale: ['junior', 'mid', 'senior', 'executive'] },
                                                },
                                                { field: 'interests', type: 'array_similarity', weight: 0.3, config: {} },
                                                { field: 'goals', type: 'array_similarity', weight: 0.1, config: {} },
                                            ],
                                            constraints: [],
                                        },
                                        status: 'active',
                                        startsAt: '2026-03-15T18:00:00.000Z',
                                        endsAt: '2026-03-15T22:00:00.000Z',
                                        createdAt: '2026-02-16T10:00:00.000Z',
                                        updatedAt: '2026-02-16T10:00:00.000Z',
                                    },
                                },
                            },
                        },
                    },
                    '400': {
                        description: 'Validation error — event not found, event not active, or missing required profile fields',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                                examples: {
                                    eventNotFound: {
                                        summary: 'Event does not exist',
                                        value: { error: 'Event not found' },
                                    },
                                    eventNotActive: {
                                        summary: 'Event is not accepting registrations',
                                        value: { error: 'Event is not active (status: draft)' },
                                    },
                                    missingFields: {
                                        summary: 'Required profile fields missing',
                                        value: { error: 'Missing required fields: industry, role' },
                                    },
                                },
                            },
                        },
                    },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '500': { $ref: '#/components/responses/InternalError' },
                },
            },
            get: {
                tags: ['Attendees'],
                summary: 'List attendees for an event',
                description: 'List all attendees registered for a specific event. Supports pagination and search by attendee name.',
                operationId: 'listAttendees',
                security: [{ ApiKeyAuth: [] }],
                parameters: [
                    {
                        name: 'eventId',
                        in: 'path',
                        required: true,
                        description: 'UUID of the event',
                        schema: { type: 'string', format: 'uuid', example: 'b3f1a2c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c' },
                    },
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
                        description: 'Search attendees by name',
                        schema: { type: 'string', maxLength: 100, example: 'Alice' },
                    },
                ],
                responses: {
                    '200': {
                        description: 'List of attendees for the event',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        message: { type: 'string', example: 'Events Fetched Successfully' },
                                        data: {
                                            type: 'array',
                                            items: { $ref: '#/components/schemas/Attendee' },
                                        },
                                    },
                                },
                                example: {
                                    message: 'Events Fetched Successfully',
                                    data: [
                                        {
                                            id: 'c4d5e6f7-a8b9-0c1d-2e3f-4a5b6c7d8e9f',
                                            eventId: 'b3f1a2c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c',
                                            tenantId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                                            externalId: 'user_123',
                                            name: 'Alice Chen',
                                            email: 'alice@example.com',
                                            profile: {
                                                industry: 'tech',
                                                role: 'engineer',
                                                experience: 'senior',
                                                interests: ['ai', 'web3', 'startups'],
                                                goals: ['find_cofounders', 'learn'],
                                            },
                                            preferences: null,
                                            status: 'in_pool',
                                            createdAt: '2026-02-16T11:00:00.000Z',
                                            updatedAt: '2026-02-16T11:00:00.000Z',
                                            deletedAt: null,
                                        },
                                        {
                                            id: 'd5e6f7a8-b9c0-1d2e-3f4a-5b6c7d8e9f0a',
                                            eventId: 'b3f1a2c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c',
                                            tenantId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                                            externalId: 'user_456',
                                            name: 'Bob Smith',
                                            email: 'bob@example.com',
                                            profile: {
                                                industry: 'tech',
                                                role: 'designer',
                                                experience: 'mid',
                                                interests: ['design', 'ai', 'saas'],
                                                goals: ['networking', 'find_job'],
                                            },
                                            preferences: [
                                                { field: 'experience', value: ['senior', 'executive'], type: 'in' },
                                                { field: 'industry', value: ['tech', 'finance'], type: 'in' },
                                            ],
                                            status: 'in_pool',
                                            createdAt: '2026-02-16T11:05:00.000Z',
                                            updatedAt: '2026-02-16T11:05:00.000Z',
                                            deletedAt: null,
                                        },
                                        {
                                            id: 'e6f7a8b9-c0d1-2e3f-4a5b-6c7d8e9f0a1b',
                                            eventId: 'b3f1a2c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c',
                                            tenantId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                                            externalId: 'user_789',
                                            name: 'Carol Wang',
                                            email: 'carol@example.com',
                                            profile: {
                                                industry: 'finance',
                                                role: 'pm',
                                                experience: 'executive',
                                                interests: ['fintech', 'web3'],
                                                goals: ['mentorship', 'investing'],
                                            },
                                            preferences: [{ field: 'role', value: ['engineer', 'designer', 'pm'], type: 'in' }],
                                            status: 'in_pool',
                                            createdAt: '2026-02-16T11:10:00.000Z',
                                            updatedAt: '2026-02-16T11:10:00.000Z',
                                            deletedAt: null,
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
    },

    components: {
        schemas: {
            CreateAttendeeInput: {
                type: 'object',
                required: ['name', 'profile'],
                description: 'Input for registering an attendee to an event.',
                properties: {
                    name: {
                        type: 'string',
                        description: 'Attendee display name',
                        example: 'Alice Chen',
                    },
                    email: {
                        type: 'string',
                        format: 'email',
                        description: 'Attendee email address',
                        example: 'alice@example.com',
                    },
                    externalId: {
                        type: 'string',
                        description: "Your system's ID for this attendee (unique per event)",
                        example: 'user_123',
                    },
                    profile: {
                        type: 'object',
                        additionalProperties: true,
                        description:
                            "Flexible key-value profile attributes scored by the event's matching config. " +
                            "Keys must include all fields listed in the event's `matchingConfig.requiredFields`.",
                        example: {
                            industry: 'tech',
                            role: 'engineer',
                            experience: 'senior',
                            interests: ['ai', 'web3', 'startups'],
                            goals: ['find_cofounders', 'learn'],
                        },
                    },
                    preferences: {
                        type: 'array',
                        description:
                            'Attendee-side matching preferences. Each preference defines a field-level constraint ' +
                            'used during matching to filter or influence pairings.',
                        items: { $ref: '#/components/schemas/AttendeePreference' },
                        example: [
                            { field: 'experience', value: ['senior', 'executive'], type: 'in' },
                            { field: 'industry', value: ['tech', 'finance'], type: 'in' },
                        ],
                    },
                },
            },

            AttendeePreference: {
                type: 'object',
                required: ['field', 'value', 'type'],
                description: 'A preference constraint on a specific profile field.',
                properties: {
                    field: {
                        type: 'string',
                        description: 'Profile field name to constrain',
                        example: 'experience',
                    },
                    value: {
                        type: 'array',
                        items: {},
                        description:
                            'Acceptable values for the field. For `in` type, this is a list of allowed values. ' +
                            'For `range` type, this is a two-element array [min, max].',
                        example: ['senior', 'executive'],
                    },
                    type: {
                        type: 'string',
                        enum: ['in', 'range'],
                        description:
                            '`in` — attendee prefers matches whose field value is in the given list. ' +
                            '`range` — attendee prefers matches whose field value falls within [min, max].',
                        example: 'in',
                    },
                },
            },

            Attendee: {
                type: 'object',
                description: 'A registered attendee in the matching pool.',
                properties: {
                    id: {
                        type: 'string',
                        format: 'uuid',
                        description: 'Unique attendee identifier',
                        example: 'c4d5e6f7-a8b9-0c1d-2e3f-4a5b6c7d8e9f',
                    },
                    eventId: {
                        type: 'string',
                        format: 'uuid',
                        description: 'ID of the event this attendee belongs to',
                        example: 'b3f1a2c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c',
                    },
                    tenantId: {
                        type: 'string',
                        format: 'uuid',
                        description: 'ID of the tenant that owns this attendee',
                        example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                    },
                    externalId: {
                        type: 'string',
                        nullable: true,
                        description: "External system's ID for this attendee",
                        example: 'user_123',
                    },
                    name: {
                        type: 'string',
                        description: 'Attendee display name',
                        example: 'Alice Chen',
                    },
                    email: {
                        type: 'string',
                        nullable: true,
                        description: 'Attendee email',
                        example: 'alice@example.com',
                    },
                    profile: {
                        type: 'object',
                        additionalProperties: true,
                        description: 'Attendee profile attributes used for matching',
                        example: {
                            industry: 'tech',
                            role: 'engineer',
                            experience: 'senior',
                            interests: ['ai', 'web3', 'startups'],
                            goals: ['find_cofounders', 'learn'],
                        },
                    },
                    preferences: {
                        oneOf: [
                            {
                                type: 'array',
                                items: { $ref: '#/components/schemas/AttendeePreference' },
                            },
                            { type: 'null' },
                        ],
                        nullable: true,
                        description: 'Attendee matching preferences',
                    },
                    status: {
                        type: 'string',
                        enum: ['pending', 'in_pool', 'matched', 'opted_out'],
                        description:
                            'Attendee lifecycle status: `pending` (just registered), `in_pool` (ready for matching), ' +
                            '`matched` (has been matched), `opted_out` (removed from pool)',
                        example: 'in_pool',
                    },
                    createdAt: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Registration timestamp',
                        example: '2026-02-16T11:00:00.000Z',
                    },
                    updatedAt: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Last update timestamp',
                        example: '2026-02-16T11:00:00.000Z',
                    },
                    deletedAt: {
                        type: 'string',
                        format: 'date-time',
                        nullable: true,
                        description: 'Soft-delete timestamp (null if active)',
                        example: null,
                    },
                },
            },

            UpdateAttendeeInput: {
                type: 'object',
                description: 'Partial update for an attendee — include only the fields you want to change.',
                properties: {
                    name: {
                        type: 'string',
                        description: 'Updated attendee name',
                        example: 'Alice Chen-Wang',
                    },
                    email: {
                        type: 'string',
                        format: 'email',
                        description: 'Updated email address',
                        example: 'alice.wang@example.com',
                    },
                    profile: {
                        type: 'object',
                        additionalProperties: true,
                        description: 'Updated profile attributes',
                    },
                    preferences: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/AttendeePreference' },
                        description: 'Updated matching preferences',
                    },
                    status: {
                        type: 'string',
                        enum: ['pending', 'in_pool', 'matched', 'opted_out'],
                        description: 'Updated attendee status',
                    },
                },
            },
        },
    },
};
