import type { ControllerArgsTypes } from '@/core/handlers';

export interface FindMatchesPayload extends ControllerArgsTypes {
    params: { eventId: string };
    input: {
        attendeeId: string;
        limit?: number;
        includeBreakdown?: boolean;
        excludeIds?: string[];
    };
}

export interface BatchMatchPayload extends ControllerArgsTypes {
    params: { eventId: string };
}

export interface GetMatchesPayload extends ControllerArgsTypes {
    params: { eventId: string };
    query: {
        page?: number;
        pageSize?: number;
        attendeeId?: string;
    };
}

export interface UpdateMatchStatusPayload extends ControllerArgsTypes {
    params: { eventId: string; matchId: string };
    input: { status: 'confirmed' | 'rejected' };
}

export interface ListJobsPayload extends ControllerArgsTypes {
    params: { eventId: string };
    query: {
        page?: number;
        pageSize?: number;
    };
}

export interface GetDashboardStatsPayload extends ControllerArgsTypes {
    query: {
        from?: string;
        to?: string;
    };
}
