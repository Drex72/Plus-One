import { BaseService, ControllerArgs, HttpStatus, UnAuthorizedError } from '@/core';
import { supabaseAdmin } from '@/core/config';
import type { GetDashboardStatsPayload } from '../../interfaces';

export class GetDashboardStats extends BaseService {
    handle = async (payload: ControllerArgs<GetDashboardStatsPayload>) => {
        const { query, request } = payload;
        const currentTenant = request.tenant;
        if (!currentTenant) throw new UnAuthorizedError('Invalid Tenant!');

        const tenantId = currentTenant.id!;

        // Fetch events
        const { data: events } = await supabaseAdmin.from('events').select('id, status, created_at').eq('tenant_id', tenantId).is('deleted_at', null);

        const allEvents = events ?? [];

        // Fetch attendees count per status
        const { data: attendees } = await supabaseAdmin
            .from('attendees')
            .select('id, status, event_id, created_at')
            .eq('tenant_id', tenantId)
            .is('deleted_at', null);

        const allAttendees = attendees ?? [];

        // Fetch matches
        const { data: matches } = await supabaseAdmin.from('matches').select('id, status, score, event_id, created_at').eq('tenant_id', tenantId);

        const allMatches = matches ?? [];

        // Fetch matching jobs
        const { data: jobs } = await supabaseAdmin
            .from('matching_jobs')
            .select('id, status, mode, result_summary, created_at, completed_at')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(10);

        const recentJobs = jobs ?? [];

        // Compute stats
        const eventsByStatus: Record<string, number> = {};
        for (const e of allEvents) {
            eventsByStatus[e.status] = (eventsByStatus[e.status] ?? 0) + 1;
        }

        const attendeesByStatus: Record<string, number> = {};
        for (const a of allAttendees) {
            attendeesByStatus[a.status] = (attendeesByStatus[a.status] ?? 0) + 1;
        }

        const matchesByStatus: Record<string, number> = {};
        let totalScore = 0;
        const scoreDistribution = { '0-20': 0, '20-40': 0, '40-60': 0, '60-80': 0, '80-100': 0 };
        for (const m of allMatches) {
            matchesByStatus[m.status] = (matchesByStatus[m.status] ?? 0) + 1;
            totalScore += m.score;
            if (m.score < 20) scoreDistribution['0-20']++;
            else if (m.score < 40) scoreDistribution['20-40']++;
            else if (m.score < 60) scoreDistribution['40-60']++;
            else if (m.score < 80) scoreDistribution['60-80']++;
            else scoreDistribution['80-100']++;
        }

        const avgScore = allMatches.length > 0 ? Math.round(totalScore / allMatches.length) : 0;

        // Events per day (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const eventsOverTime: Record<string, number> = {};
        for (const e of allEvents) {
            const date = new Date(e.created_at).toISOString().split('T')[0];
            if (new Date(e.created_at) >= thirtyDaysAgo) {
                eventsOverTime[date] = (eventsOverTime[date] ?? 0) + 1;
            }
        }

        // Attendees per day (last 30 days)
        const attendeesOverTime: Record<string, number> = {};
        for (const a of allAttendees) {
            const date = new Date(a.created_at).toISOString().split('T')[0];
            if (new Date(a.created_at) >= thirtyDaysAgo) {
                attendeesOverTime[date] = (attendeesOverTime[date] ?? 0) + 1;
            }
        }

        return {
            code: HttpStatus.OK,
            message: 'Dashboard stats fetched',
            data: {
                totalEvents: allEvents.length,
                totalAttendees: allAttendees.length,
                totalMatches: allMatches.length,
                avgMatchScore: avgScore,
                eventsByStatus,
                attendeesByStatus,
                matchesByStatus,
                scoreDistribution,
                eventsOverTime,
                attendeesOverTime,
                recentJobs: recentJobs.map((j) => ({
                    id: j.id,
                    status: j.status,
                    mode: j.mode,
                    resultSummary: j.result_summary,
                    createdAt: j.created_at,
                    completedAt: j.completed_at,
                })),
            },
        };
    };
}

const getDashboardStatsInstance = new GetDashboardStats();
export default getDashboardStatsInstance;
