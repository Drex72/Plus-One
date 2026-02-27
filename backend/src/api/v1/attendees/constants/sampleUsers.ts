import { CreateAttendeeInput } from '../interfaces';

/**
 * ATTENDEES for Tech Networking SF 2025 Event
 * @module Reference Events Module
 * @file Events Preset.ts
 */
const attendee1: CreateAttendeeInput = {
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
};

const attendee2: CreateAttendeeInput = {
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
        {
            field: 'experience',
            value: ['senior', 'executive'],
            type: 'in',
        },
        {
            field: 'industry',
            value: ['tech', 'finance'],
            type: 'in',
        },
    ],
};

const attendee3: CreateAttendeeInput = {
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
    preferences: [
        {
            field: 'role',
            value: ['engineer', 'designer', 'pm'],
            type: 'in',
        },
    ],
};

/**
 * ATTENDEES for Valentine's Speed Dating
 * @module Reference Events Module
 * @file Events Preset.ts
 */
const dateAttendee1: CreateAttendeeInput = {
    externalId: 'dating_user_001',
    name: 'David Lee',
    email: 'david@example.com',
    profile: {
        age: 28,
        gender: 'male',
        interests: ['hiking', 'cooking', 'travel'],
        musicTaste: ['indie', 'rock', 'electronic'],
        drinkingLevel: 'moderate',
        fashionStyle: 'casual',
    },
    preferences: [
        {
            field: 'gender',
            value: ['female'],
            type: 'in',
        },
        {
            field: 'age',
            value: [25, 32],
            type: 'range',
        },
    ],
};

const dateAttendee2: CreateAttendeeInput = {
    externalId: 'dating_user_002',
    name: 'Emma Rodriguez',
    email: 'emma@example.com',
    profile: {
        age: 26,
        gender: 'female',
        interests: ['art', 'music', 'yoga'],
        musicTaste: ['indie', 'folk', 'jazz'],
        drinkingLevel: 'light',
        fashionStyle: 'alte',
    },
    preferences: [
        {
            field: 'gender',
            value: ['male', 'non-binary'],
            type: 'in',
        },
        {
            field: 'fashionStyle',
            value: ['alte', 'gothic', 'vintage'],
            type: 'in',
        },
        {
            field: 'age',
            value: [24, 30],
            type: 'range',
        },
    ],
};

const dateAttendee3: CreateAttendeeInput = {
    externalId: 'dating_user_003',
    name: 'Jordan Taylor',
    email: 'jordan@example.com',
    profile: {
        age: 29,
        gender: 'non-binary',
        interests: ['gaming', 'music', 'tech'],
        musicTaste: ['electronic', 'pop', 'indie'],
        drinkingLevel: 'moderate',
        fashionStyle: 'streetwear',
    },
    preferences: [
        {
            field: 'gender',
            value: ['female', 'non-binary'],
            type: 'in',
        },
        {
            field: 'drinkingLevel',
            value: ['light', 'moderate'],
            type: 'in',
        },
    ],
};

/**
 * ATTENDEES for YC Cofounder Matching
 * @module Reference Events Module
 * @file Events Preset.ts
 */
const cofounderAttendee1: CreateAttendeeInput = {
    externalId: 'founder_001',
    name: 'Michael Chang',
    email: 'michael@example.com',
    profile: {
        roleType: 'technical',
        industry: 'saas',
        stage: 'mvp',
        skills: ['react', 'python', 'aws', 'machine-learning'],
        lookingFor: ['business', 'sales', 'marketing'],
        location: 'San Francisco',
    },
    preferences: [
        {
            field: 'roleType',
            value: ['business'],
            type: 'in',
        },
        {
            field: 'stage',
            value: ['idea', 'mvp', 'launched'],
            type: 'in',
        },
        {
            field: 'location',
            value: ['San Francisco', 'Bay Area', 'Remote'],
            type: 'in',
        },
    ],
};

const cofounderAttendee2: CreateAttendeeInput = {
    externalId: 'founder_002',
    name: 'Sarah Kim',
    email: 'sarah@example.com',
    profile: {
        roleType: 'business',
        industry: 'fintech',
        stage: 'idea',
        skills: ['sales', 'fundraising', 'strategy', 'finance'],
        lookingFor: ['technical', 'engineering', 'cto'],
        location: 'New York',
    },
    preferences: [
        {
            field: 'roleType',
            value: ['technical', 'design'],
            type: 'in',
        },
        {
            field: 'industry',
            value: ['fintech', 'saas', 'blockchain'],
            type: 'in', // Prefer these industries
        },
    ],
};

const cofounderAttendee3: CreateAttendeeInput = {
    externalId: 'founder_003',
    name: 'Alex Rivera',
    email: 'alex@example.com',
    profile: {
        roleType: 'design',
        industry: 'consumer',
        stage: 'launched',
        skills: ['ui-ux', 'figma', 'user-research', 'branding'],
        lookingFor: ['technical', 'business'],
        location: 'Remote',
    },
    preferences: [
        {
            field: 'stage',
            value: ['mvp', 'launched', 'revenue'],
            type: 'in',
        },
    ],
};
