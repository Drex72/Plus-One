import { CreateEventInput } from '../interfaces';

const networkingEvent: CreateEventInput = {
    name: 'Tech Networking SF 2025',
    description: 'Connect with tech professionals in the Bay Area',
    startsAt: '2025-03-15T18:00:00Z',
    endsAt: '2025-03-15T22:00:00Z',
    matchingConfig: {
        matchThreshold: 65,
        requiredFields: ['industry', 'role', 'experience', 'interests', 'goals'],
        constraints: [],
        // How to match
        attributes: [
            {
                field: 'industry',
                type: 'exact',
                weight: 0.25,
                config: {},
            },
            {
                field: 'role',
                type: 'exact',
                weight: 0.2,
                config: {},
            },
            {
                field: 'interests',
                type: 'array_similarity',
                weight: 0.3,
                config: {},
            },
            {
                field: 'experience',
                type: 'ordinal',
                weight: 0.15,
                config: {
                    scale: ['junior', 'mid', 'senior', 'executive'],
                },
            },
            {
                field: 'goals',
                type: 'array_similarity',
                weight: 0.1,
                config: {},
            },
        ],
    },
};

const datingEvent: CreateEventInput = {
    name: "Valentine's Speed Dating",
    description: 'Singles mixer for 25-35 year olds',
    startsAt: '2025-02-14T19:00:00Z',
    endsAt: '2025-02-14T23:00:00Z',
    matchingConfig: {
        matchThreshold: 70,
        requiredFields: ['age', 'gender', 'interests', 'musicTaste', 'drinkingLevel', 'fashionStyle'],
        constraints: [
            {
                field: 'age',
                operator: 'range',
                value: [25, 35], // Event is only for 25-35
                type: 'hard',
            },
        ],

        attributes: [
            {
                field: 'interests',
                type: 'array_similarity',
                weight: 0.35,
                config: {},
            },
            {
                field: 'musicTaste',
                type: 'array_similarity',
                weight: 0.25,
                config: {},
            },
            {
                field: 'age',
                type: 'numeric',
                weight: 0.2,
                config: {
                    maxDistance: 10,
                },
            },
            {
                field: 'drinkingLevel',
                type: 'ordinal',
                weight: 0.15,
                config: {
                    scale: ['none', 'light', 'moderate', 'heavy'],
                },
            },
            {
                field: 'fashionStyle',
                type: 'exact',
                weight: 0.05,
                config: {},
            },
        ],
    },
};

const cofounderEvent: CreateEventInput = {
    name: 'YC Cofounder Matching',
    description: 'Find your technical/business cofounder',
    startsAt: '2025-04-01T09:00:00Z',
    endsAt: '2025-04-01T18:00:00Z',

    matchingConfig: {
        matchThreshold: 75,
        requiredFields: ['roleType', 'industry', 'stage', 'skills', 'lookingFor', 'location'],
        constraints: [
            {
                field: 'roleType',
                operator: 'neq',
                value: { field: 'roleType' }, // Can't match someone with your same role
                type: 'soft', // Soft constraint, just penalizes
            },
        ],

        attributes: [
            {
                field: 'roleType',
                type: 'exact',
                weight: 0.3,
                config: {},
            },
            {
                field: 'industry',
                type: 'exact',
                weight: 0.25,
                config: {},
            },
            {
                field: 'skills',
                type: 'array_similarity',
                weight: 0.15,
                config: {},
            },
            {
                field: 'lookingFor',
                type: 'array_similarity',
                weight: 0.2,
                config: {},
            },
            {
                field: 'stage',
                type: 'ordinal',
                weight: 0.1,
                config: {
                    scale: ['idea', 'mvp', 'launched', 'revenue', 'growth'],
                },
            },
        ],
    },
};
