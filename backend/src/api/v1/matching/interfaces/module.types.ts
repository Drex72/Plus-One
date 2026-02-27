import { DatabaseTable } from '@/core/types';
import { AttendeePreference } from '~/attendees/interfaces';
import { AttributeConfig, ConstraintRule, MatchingConfig } from '~/events/interfaces';

// ─── Database Row Types ─────────────────────────────────

export type DatabaseMatch = DatabaseTable['matches']['Row'];
export type DatabaseMatchingJob = DatabaseTable['matching_jobs']['Row'];

// ─── Domain Models ──────────────────────────────────────

export type Match = {
    id: string;
    eventId: string;
    tenantId: string;
    attendeeAId: string;
    attendeeBId: string;
    score: number;
    scoreBreakdown: Record<string, number>;
    strategy: string;
    status: 'pending' | 'confirmed' | 'rejected' | 'expired';
    metadata: Record<string, unknown>;
    createdAt: string;
};

export type MatchingJob = {
    id: string;
    eventId: string;
    tenantId: string;
    triggerAttendeeId: string | null;
    mode: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    startedAt: string | null;
    completedAt: string | null;
    error: string | null;
    resultSummary: Record<string, unknown> | null;
    createdAt: string;
};

// ─── Matching Engine Types ──────────────────────────────

/**
 * An attendee enriched with profile data, ready for matching computations.
 * `profile` maps to the `attributes` column in the database.
 * `enrichedProfile` holds LLM-expanded values (stored in metadata.enrichedAttributes).
 */
export interface MatchableAttendee {
    id: string;
    eventId: string;
    tenantId: string;
    name: string;
    profile: Record<string, unknown>;
    /** LLM-enriched profile fields (expanded synonyms/hypernyms). Null if not yet enriched. */
    enrichedProfile: Record<string, string[]> | null;
    preferences: AttendeePreference[];
    status: string;
}

/** The result for a single candidate in a findMatches call. */
export interface MatchResult {
    attendee: MatchableAttendee;
    score: number;
    breakdown?: Record<string, number>;
}

/** Options for the findMatches operation. */
export interface MatchOptions {
    limit?: number;
    includeBreakdown?: boolean;
    excludeIds?: string[];
}

/** Internal scoring result from calculateMatchScore. */
export interface ScoringResult {
    score: number;
    breakdown: Record<string, number>;
}

// ─── Re-exports ─────────────────────────────────────────

export type { AttributeConfig, ConstraintRule, MatchingConfig, AttendeePreference };
