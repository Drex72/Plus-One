import type {
    ApiResponse,
    Tenant,
    Event,
    CreateEventPayload,
    UpdateEventPayload,
    Attendee,
    RegisterAttendeePayload,
    Match,
    MatchingJob,
    FindMatchResult,
    FindMatchesPayload,
    DashboardStats,
    BulkImportResult,
} from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1';

// ─── Core fetch wrapper ─────────────────────────────────

export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

async function apiFetch<T>(path: string, options?: RequestInit & { apiKey?: string }): Promise<T> {
    const { apiKey, ...fetchOptions } = options ?? {};
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(fetchOptions.headers as Record<string, string>),
    };

    if (apiKey) {
        headers['X-API-Key'] = apiKey;
    }

    const res = await fetch(`${BASE_URL}${path}`, {
        ...fetchOptions,
        headers,
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError(res.status, body.message ?? `API error: ${res.status}`);
    }

    const json = await res.json();
    return json as T;
}

// ─── Tenants ────────────────────────────────────────────

export async function createTenant(body: { name: string; webhook_endpoint?: string | null; metadata?: Record<string, unknown> }) {
    return apiFetch<ApiResponse<Tenant>>('/tenants', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

export async function getCurrentTenant(apiKey: string) {
    return apiFetch<ApiResponse<Tenant>>('/tenants/me', {
        apiKey,
        next: { revalidate: 60 },
    } as RequestInit & { apiKey: string });
}

export async function updateTenant(apiKey: string, body: { name?: string; webhook_endpoint?: string | null; metadata?: Record<string, unknown> }) {
    return apiFetch<ApiResponse<Tenant>>('/tenants/me', {
        method: 'PATCH',
        apiKey,
        body: JSON.stringify(body),
    } as RequestInit & { apiKey: string });
}

// ─── Events ─────────────────────────────────────────────

export async function getEvents(apiKey: string, params?: { page?: number; pageSize?: number; search?: string }) {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
    if (params?.search) qs.set('search', params.search);
    const query = qs.toString() ? `?${qs}` : '';

    return apiFetch<ApiResponse<Event[]>>(`/events${query}`, {
        apiKey,
        cache: 'no-store',
    } as RequestInit & { apiKey: string });
}

export async function getEventById(apiKey: string, eventId: string) {
    return apiFetch<ApiResponse<Event>>(`/events/${eventId}`, {
        apiKey,
        cache: 'no-store',
    } as RequestInit & { apiKey: string });
}

export async function createEvent(apiKey: string, body: CreateEventPayload) {
    return apiFetch<ApiResponse<Event>>('/events', {
        method: 'POST',
        apiKey,
        body: JSON.stringify(body),
    } as RequestInit & { apiKey: string });
}

export async function updateEvent(apiKey: string, eventId: string, body: UpdateEventPayload) {
    return apiFetch<ApiResponse<Event>>(`/events/${eventId}`, {
        method: 'PATCH',
        apiKey,
        body: JSON.stringify(body),
    } as RequestInit & { apiKey: string });
}

// ─── Attendees ──────────────────────────────────────────

export async function getAttendees(apiKey: string, eventId: string, params?: { page?: number; pageSize?: number; search?: string }) {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
    if (params?.search) qs.set('search', params.search);
    const query = qs.toString() ? `?${qs}` : '';

    return apiFetch<ApiResponse<Attendee[]>>(`/attendees/${eventId}${query}`, {
        apiKey,
        cache: 'no-store',
    } as RequestInit & { apiKey: string });
}

export async function registerAttendee(apiKey: string, eventId: string, body: RegisterAttendeePayload) {
    return apiFetch<ApiResponse<Event>>(`/attendees/${eventId}`, {
        method: 'POST',
        apiKey,
        body: JSON.stringify(body),
    } as RequestInit & { apiKey: string });
}

export async function updateAttendee(apiKey: string, eventId: string, attendeeId: string, body: Record<string, unknown>) {
    return apiFetch<ApiResponse<Attendee>>(`/attendees/${eventId}/${attendeeId}`, {
        method: 'PATCH',
        apiKey,
        body: JSON.stringify(body),
    } as RequestInit & { apiKey: string });
}

export async function deleteAttendee(apiKey: string, eventId: string, attendeeId: string) {
    return apiFetch<ApiResponse<null>>(`/attendees/${eventId}/${attendeeId}`, {
        method: 'DELETE',
        apiKey,
    } as RequestInit & { apiKey: string });
}

// ─── Matching ───────────────────────────────────────────

export async function triggerBatchMatch(apiKey: string, eventId: string) {
    return apiFetch<ApiResponse<{ matchingJobId: string; status: string }>>(`/matching/${eventId}/match`, {
        method: 'POST',
        apiKey,
    } as RequestInit & { apiKey: string });
}

export async function findMatches(apiKey: string, eventId: string, body: FindMatchesPayload) {
    return apiFetch<ApiResponse<FindMatchResult[]>>(`/matching/${eventId}/match/find`, {
        method: 'POST',
        apiKey,
        body: JSON.stringify(body),
    } as RequestInit & { apiKey: string });
}

export async function getMatches(apiKey: string, eventId: string, params?: { page?: number; pageSize?: number; attendeeId?: string }) {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
    if (params?.attendeeId) qs.set('attendeeId', params.attendeeId);
    const query = qs.toString() ? `?${qs}` : '';

    return apiFetch<ApiResponse<Match[]>>(`/matching/${eventId}/matches${query}`, {
        apiKey,
        cache: 'no-store',
    } as RequestInit & { apiKey: string });
}

export async function getJobStatus(apiKey: string, eventId: string, jobId: string) {
    return apiFetch<ApiResponse<MatchingJob>>(`/matching/${eventId}/match/jobs/${jobId}`, {
        apiKey,
        cache: 'no-store',
    } as RequestInit & { apiKey: string });
}

// ─── Match Status ───────────────────────────────────────

export async function stopMatching(apiKey: string, eventId: string) {
    return apiFetch<ApiResponse<{ eventId: string; status: string }>>(`/matching/${eventId}/match/stop`, {
        method: 'POST',
        apiKey,
    } as RequestInit & { apiKey: string });
}

export async function updateMatchStatus(apiKey: string, eventId: string, matchId: string, status: 'confirmed' | 'rejected') {
    return apiFetch<ApiResponse<Match>>(`/matching/${eventId}/matches/${matchId}`, {
        method: 'PATCH',
        apiKey,
        body: JSON.stringify({ status }),
    } as RequestInit & { apiKey: string });
}

// ─── Jobs ───────────────────────────────────────────────

export async function listJobs(apiKey: string, eventId: string, params?: { page?: number; pageSize?: number }) {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
    const query = qs.toString() ? `?${qs}` : '';

    return apiFetch<ApiResponse<MatchingJob[]>>(`/matching/${eventId}/jobs${query}`, {
        apiKey,
        cache: 'no-store',
    } as RequestInit & { apiKey: string });
}

// ─── Dashboard ──────────────────────────────────────────

export async function getDashboardStats(apiKey: string) {
    return apiFetch<ApiResponse<DashboardStats>>(`/matching/dashboard/stats`, {
        apiKey,
        cache: 'no-store',
    } as RequestInit & { apiKey: string });
}

// ─── Tenant Key Rotation ────────────────────────────────

export async function rotateApiKey(apiKey: string) {
    return apiFetch<ApiResponse<Tenant>>('/tenants/me/rotate-key', {
        method: 'POST',
        apiKey,
    } as RequestInit & { apiKey: string });
}

// ─── Bulk Import ────────────────────────────────────────

export async function bulkRegisterAttendees(
    apiKey: string,
    eventId: string,
    attendees: Array<{
        name: string;
        email?: string;
        externalId?: string;
        profile: Record<string, unknown>;
    }>,
) {
    return apiFetch<ApiResponse<BulkImportResult>>(`/attendees/${eventId}/bulk`, {
        method: 'POST',
        apiKey,
        body: JSON.stringify({ attendees }),
    } as RequestInit & { apiKey: string });
}
