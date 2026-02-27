// ─── Tenant ─────────────────────────────────────────────

export interface Tenant {
    id: string;
    name: string;
    apiKey: string;
    webhookEndpoint: string | null;
    metadata: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

// ─── Event ──────────────────────────────────────────────

export type EventStatus = 'draft' | 'active' | 'matching' | 'completed' | 'archived';

export interface AttributeConfig {
    field: string;
    type: 'array_similarity' | 'ordinal' | 'exact' | 'numeric';
    weight: number;
    config?: {
        scale?: string[];
        maxDistance?: number;
    };
}

export interface ConstraintRule {
    field: string;
    operator: 'eq' | 'neq' | 'in' | 'not_in' | 'range' | 'gte' | 'lte';
    value: unknown;
    type: 'hard' | 'soft';
}

export interface MatchingConfig {
    matchThreshold?: number;
    requiredFields: string[];
    attributes: AttributeConfig[];
    constraints: ConstraintRule[];
}

export interface Event {
    id: string;
    tenantId: string;
    name: string;
    description: string | null;
    matchingConfig: MatchingConfig | null;
    status: EventStatus;
    startsAt: string | null;
    endsAt: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface CreateEventPayload {
    name: string;
    description?: string | null;
    matchingConfig?: MatchingConfig;
    startsAt?: string | null;
    endsAt?: string | null;
}

export interface UpdateEventPayload {
    name?: string;
    description?: string | null;
    matchingConfig?: MatchingConfig;
    status?: EventStatus;
    startsAt?: string | null;
    endsAt?: string | null;
}

// ─── Attendee ───────────────────────────────────────────

export type AttendeeStatus = 'pending' | 'in_pool' | 'matched' | 'opted_out';

export interface AttendeePreference {
    field: string;
    value: unknown[];
    type: 'in' | 'range';
}

export interface Attendee {
    id: string;
    eventId: string;
    tenantId: string;
    externalId: string | null;
    name: string;
    email: string | null;
    attributes: Record<string, unknown>;
    preferences: AttendeePreference[];
    status: AttendeeStatus;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface RegisterAttendeePayload {
    name: string;
    email?: string;
    externalId?: string;
    profile: Record<string, unknown>;
    preferences?: AttendeePreference[];
}

// ─── Match ──────────────────────────────────────────────

export type MatchStatus = 'pending' | 'confirmed' | 'rejected' | 'expired';

export interface Match {
    id: string;
    eventId: string;
    tenantId: string;
    attendeeAId: string;
    attendeeBId: string;
    score: number;
    scoreBreakdown: Record<string, number>;
    strategy: string;
    status: MatchStatus;
    metadata: Record<string, unknown>;
    aiExplanation: string | null;
    createdAt: string;
}

// ─── Matching Job ───────────────────────────────────────

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface ResultSummary {
    totalAttendees: number;
    totalPairsScored: number;
    matchesFound: number;
    matchesStored: number;
    threshold: number;
    elapsedMs: number;
}

export interface MatchingJob {
    id: string;
    eventId: string;
    tenantId: string;
    triggerAttendeeId: string | null;
    mode: string;
    status: JobStatus;
    startedAt: string | null;
    completedAt: string | null;
    error: string | null;
    resultSummary: ResultSummary | null;
    createdAt: string;
}

// ─── Find‑Matches (real‑time) ───────────────────────────

export interface FindMatchResult {
    attendee: {
        id: string;
        eventId: string;
        tenantId: string;
        name: string;
        profile: Record<string, unknown>;
        preferences: AttendeePreference[];
        status: string;
    };
    score: number;
    breakdown?: Record<string, number>;
}

export interface FindMatchesPayload {
    attendeeId: string;
    limit?: number;
    includeBreakdown?: boolean;
    excludeIds?: string[];
}

// ─── API Response Envelope ──────────────────────────────

export interface ApiResponse<T> {
    code: number;
    message: string;
    data: T;
}

// ─── Session ────────────────────────────────────────────

export type UserRole = 'admin' | 'tenant';

export interface Session {
    apiKey: string;
    tenant: Tenant;
    role: UserRole;
}

// ─── Dashboard Stats ────────────────────────────────────

export interface DashboardStats {
    totalEvents: number;
    totalAttendees: number;
    totalMatches: number;
    avgMatchScore: number;
    eventsByStatus: Record<string, number>;
    attendeesByStatus: Record<string, number>;
    matchesByStatus: Record<string, number>;
    scoreDistribution: Record<string, number>;
    eventsOverTime: Record<string, number>;
    attendeesOverTime: Record<string, number>;
    recentJobs: Array<{
        id: string;
        status: string;
        mode: string;
        resultSummary: Record<string, unknown> | null;
        createdAt: string;
        completedAt: string | null;
    }>;
}

// ─── Bulk Import ────────────────────────────────────────

export interface BulkImportResult {
    successCount: number;
    errorCount: number;
    errors: Array<{ index: number; error: string }>;
}
