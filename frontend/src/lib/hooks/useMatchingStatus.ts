'use client';

import { useQuery } from '@tanstack/react-query';
import type { ApiResponse, MatchingJob } from '@/lib/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1';

async function fetchJobStatus(apiKey: string, eventId: string, jobId: string): Promise<MatchingJob> {
    const res = await fetch(`${BASE_URL}/matching/${eventId}/match/jobs/${jobId}`, {
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
        },
        cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Job fetch failed: ${res.status}`);
    const json: ApiResponse<MatchingJob> = await res.json();
    return json.data;
}

/**
 * Polls a matching job until it reaches a terminal state (completed / failed).
 * Polls every 3s while the job is queued or processing.
 */
export function useMatchingJobStatus(apiKey: string | null, eventId: string | null, jobId: string | null) {
    return useQuery({
        queryKey: ['matching-job', eventId, jobId],
        queryFn: () => fetchJobStatus(apiKey!, eventId!, jobId!),
        enabled: Boolean(apiKey && eventId && jobId),
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            if (status === 'queued' || status === 'processing') return 1000;
            return false;
        },
    });
}
