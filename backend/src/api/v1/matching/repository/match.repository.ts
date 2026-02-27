import { BaseRepository, supabaseAdmin } from '@/core';
import { Json } from '@/core/types/common/database.interface';
import { toMatchableAttendee, chunk } from '../engine';
import type { DatabaseMatch, DatabaseMatchingJob, Match, MatchableAttendee, MatchingJob } from '../interfaces';

/** Batch insert chunk size for match records. */
const BATCH_INSERT_SIZE = 100;

export class MatchRepository extends BaseRepository<DatabaseMatch, Match> {
    protected readonly table = 'matches';

    // ─── Match Operations ───────────────────────────────

    /**
     * Retrieves matches for an event, scoped to a tenant.
     * Optionally filtered by attendee. Results are sorted by score descending.
     */
    async findByEvent(eventId: string, tenantId: string, options?: { attendeeId?: string; page?: number; pageSize?: number }): Promise<Match[]> {
        const { attendeeId, page = 1, pageSize = 20 } = options ?? {};
        const offset = (page - 1) * pageSize;

        let query = supabaseAdmin
            .from(this.table)
            .select('*')
            .eq('event_id', eventId)
            .eq('tenant_id', tenantId)
            .order('score', { ascending: false })
            .range(offset, offset + pageSize - 1);

        if (attendeeId) {
            query = query.or(`attendee_a_id.eq.${attendeeId},attendee_b_id.eq.${attendeeId}`);
        }

        const { data, error } = await query;
        if (error) throw new Error(`Failed to fetch matches: ${error.message}`);

        return (data ?? []).map(this.mapToCamelCase);
    }

    /**
     * Creates a single match record.
     */
    async createMatch(input: {
        eventId: string;
        tenantId: string;
        attendeeAId: string;
        attendeeBId: string;
        score: number;
        scoreBreakdown: Record<string, number>;
        strategy: string;
    }): Promise<Match> {
        const { data, error } = await supabaseAdmin
            .from(this.table)
            .insert({
                event_id: input.eventId,
                tenant_id: input.tenantId,
                attendee_a_id: input.attendeeAId,
                attendee_b_id: input.attendeeBId,
                score: input.score,
                score_breakdown: input.scoreBreakdown as unknown as Json,
                strategy: input.strategy,
                status: 'pending',
            })
            .select()
            .single();

        if (error) throw new Error(`Failed to create match: ${error.message}`);

        return this.mapToCamelCase(data);
    }

    /**
     * Batch-inserts multiple match records in chunks.
     * Returns the total number of matches inserted.
     */
    async createManyMatches(
        matches: Array<{
            eventId: string;
            tenantId: string;
            attendeeAId: string;
            attendeeBId: string;
            score: number;
            scoreBreakdown: Record<string, number>;
            strategy: string;
        }>,
    ): Promise<number> {
        if (matches.length === 0) return 0;

        let insertedCount = 0;
        const batches = chunk(matches, BATCH_INSERT_SIZE);

        for (const batch of batches) {
            const rows = batch.map((m) => ({
                event_id: m.eventId,
                tenant_id: m.tenantId,
                attendee_a_id: m.attendeeAId,
                attendee_b_id: m.attendeeBId,
                score: m.score,
                score_breakdown: m.scoreBreakdown as unknown as Json,
                strategy: m.strategy,
                status: 'pending',
            }));

            const { error } = await supabaseAdmin.from(this.table).insert(rows);

            if (error) throw new Error(`Failed to batch-insert matches: ${error.message}`);

            insertedCount += batch.length;
        }

        return insertedCount;
    }

    // ─── Matching Job Operations ────────────────────────

    /**
     * Updates the status of a single match.
     */
    async updateMatchStatus(matchId: string, tenantId: string, status: string): Promise<Match> {
        const { data, error } = await supabaseAdmin.from(this.table).update({ status }).eq('id', matchId).eq('tenant_id', tenantId).select().single();

        if (error) throw new Error(`Failed to update match status: ${error.message}`);

        return this.mapToCamelCase(data);
    }

    /**
     * Deletes all matches for an event+tenant combination.
     * Used before re-running batch matching to prevent duplicates.
     */
    async deleteMatchesByEvent(eventId: string, tenantId: string): Promise<number> {
        const { data, error } = await supabaseAdmin.from(this.table).delete().eq('event_id', eventId).eq('tenant_id', tenantId).select('id');

        if (error) throw new Error(`Failed to delete existing matches: ${error.message}`);

        return data?.length ?? 0;
    }

    /**
     * Creates a new matching job record.
     */
    async createJob(input: { eventId: string; tenantId: string; triggerAttendeeId?: string; mode: string }): Promise<MatchingJob> {
        const { data, error } = await supabaseAdmin
            .from('matching_jobs')
            .insert({
                event_id: input.eventId,
                tenant_id: input.tenantId,
                trigger_attendee_id: input.triggerAttendeeId ?? null,
                mode: input.mode,
                status: 'queued',
            })
            .select()
            .single();

        if (error) throw new Error(`Failed to create matching job: ${error.message}`);

        return this.mapJobToCamelCase(data);
    }

    /**
     * Updates a matching job's status and metadata.
     */
    async updateJob(
        jobId: string,
        updates: Partial<{
            status: string;
            startedAt: string;
            completedAt: string;
            error: string;
            resultSummary: Record<string, unknown>;
        }>,
    ): Promise<void> {
        const payload: Record<string, unknown> = {};
        if (updates.status !== undefined) payload.status = updates.status;
        if (updates.startedAt !== undefined) payload.started_at = updates.startedAt;
        if (updates.completedAt !== undefined) payload.completed_at = updates.completedAt;
        if (updates.error !== undefined) payload.error = updates.error;
        if (updates.resultSummary !== undefined) payload.result_summary = updates.resultSummary;

        const { error } = await supabaseAdmin.from('matching_jobs').update(payload).eq('id', jobId);

        if (error) throw new Error(`Failed to update matching job: ${error.message}`);
    }

    /**
     * Retrieves a matching job by ID, scoped to a tenant.
     */
    async getJobById(jobId: string, tenantId: string): Promise<MatchingJob | null> {
        const { data, error } = await supabaseAdmin.from('matching_jobs').select('*').eq('id', jobId).eq('tenant_id', tenantId).maybeSingle();

        if (error) throw new Error(`Failed to fetch matching job: ${error.message}`);
        if (!data) return null;

        return this.mapJobToCamelCase(data);
    }

    /**
     * List all matching jobs for an event, most recent first.
     */
    async listJobsByEvent(eventId: string, tenantId: string, options?: { page?: number; pageSize?: number }): Promise<MatchingJob[]> {
        const { page = 1, pageSize = 20 } = options ?? {};
        const offset = (page - 1) * pageSize;

        const { data, error } = await supabaseAdmin
            .from('matching_jobs')
            .select('*')
            .eq('event_id', eventId)
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .range(offset, offset + pageSize - 1);

        if (error) throw new Error(`Failed to list matching jobs: ${error.message}`);

        return (data ?? []).map(this.mapJobToCamelCase);
    }

    // ─── Attendee Pool (matching-specific queries) ──────

    /**
     * Moves all eligible attendees (pending or previously matched) into the matching pool
     * by setting their status to 'in_pool'. Called at the start of batch matching.
     * Includes 'matched' so that re-runs reset everyone back into the pool.
     */
    async moveAttendeesToPool(eventId: string, tenantId: string): Promise<number> {
        const { data, error } = await supabaseAdmin
            .from('attendees')
            .update({ status: 'in_pool' })
            .eq('event_id', eventId)
            .eq('tenant_id', tenantId)
            .in('status', ['pending', 'matched'])
            .is('deleted_at', null)
            .select('id');

        if (error) throw new Error(`Failed to move attendees to pool: ${error.message}`);

        return data?.length ?? 0;
    }

    /**
     * Bulk-update attendee statuses after matching completes.
     */
    async updateAttendeeStatuses(attendeeIds: string[], status: string): Promise<void> {
        if (attendeeIds.length === 0) return;

        const { error } = await supabaseAdmin.from('attendees').update({ status }).in('id', attendeeIds);

        if (error) throw new Error(`Failed to update attendee statuses: ${error.message}`);
    }

    /**
     * Saves LLM-enriched profile data into the attendee's metadata column.
     * Merges with existing metadata (preserves other keys).
     */
    async saveEnrichedProfile(attendeeId: string, enrichedAttributes: Record<string, string[]>): Promise<void> {
        // Fetch current metadata first (to merge, not overwrite)
        const { data: current, error: fetchErr } = await supabaseAdmin.from('attendees').select('metadata').eq('id', attendeeId).single();

        if (fetchErr) throw new Error(`Failed to fetch attendee metadata: ${fetchErr.message}`);

        const existingMeta = (current?.metadata as Record<string, unknown>) ?? {};
        const updatedMeta = { ...existingMeta, enrichedAttributes };

        const { error } = await supabaseAdmin
            .from('attendees')
            .update({ metadata: updatedMeta as any })
            .eq('id', attendeeId);

        if (error) throw new Error(`Failed to save enriched profile: ${error.message}`);
    }

    /**
     * Batch-save enriched profiles for multiple attendees.
     */
    async batchSaveEnrichedProfiles(updates: Array<{ id: string; enrichedAttributes: Record<string, string[]> }>): Promise<number> {
        let saved = 0;
        for (const update of updates) {
            try {
                await this.saveEnrichedProfile(update.id, update.enrichedAttributes);
                saved++;
            } catch (err) {
                // Log but don't fail the whole batch
                const msg = err instanceof Error ? err.message : String(err);
                console.warn(`Failed to save enriched profile for ${update.id}: ${msg}`);
            }
        }
        return saved;
    }

    /**
     * Fetches attendees eligible for matching, returned as MatchableAttendee.
     * Only includes attendees with 'pending' or 'in_pool' status.
     * Scoped to tenant for multi-tenant isolation.
     */
    async getMatchPool(eventId: string, tenantId: string, excludeIds: string[] = []): Promise<MatchableAttendee[]> {
        let query = supabaseAdmin
            .from('attendees')
            .select('id, event_id, tenant_id, name, attributes, preferences, status, metadata')
            .eq('event_id', eventId)
            .eq('tenant_id', tenantId)
            .eq('status', 'in_pool')
            .is('deleted_at', null)
            .order('created_at', { ascending: true });

        const { data, error } = await query;
        if (error) throw new Error(`Failed to fetch match pool: ${error.message}`);

        let pool = (data ?? []).map(toMatchableAttendee);

        if (excludeIds.length > 0) {
            const excludeSet = new Set(excludeIds);
            pool = pool.filter((a) => !excludeSet.has(a.id));
        }

        return pool;
    }

    /**
     * Fetches a single attendee by ID, scoped to tenant, returned as MatchableAttendee.
     */
    async getMatchableAttendee(attendeeId: string, tenantId: string): Promise<MatchableAttendee | null> {
        const { data, error } = await supabaseAdmin
            .from('attendees')
            .select('id, event_id, tenant_id, name, attributes, preferences, status, metadata')
            .eq('id', attendeeId)
            .eq('tenant_id', tenantId)
            .is('deleted_at', null)
            .maybeSingle();

        if (error) throw new Error(`Failed to fetch attendee: ${error.message}`);
        if (!data) return null;

        return toMatchableAttendee(data);
    }

    // ─── Event Status ─────────────────────────────────

    /**
     * Updates the status of an event. Used by matching services to
     * transition events between 'active', 'matching', and 'completed'.
     */
    async updateEventStatus(eventId: string, tenantId: string, status: string): Promise<void> {
        const { error } = await supabaseAdmin.from('events').update({ status }).eq('id', eventId).eq('tenant_id', tenantId);

        if (error) throw new Error(`Failed to update event status: ${error.message}`);
    }

    /**
     * Returns the count of attendees still in the matching pool for an event.
     */
    async getPoolCount(eventId: string, tenantId: string): Promise<number> {
        const { count, error } = await supabaseAdmin
            .from('attendees')
            .select('id', { count: 'exact', head: true })
            .eq('event_id', eventId)
            .eq('tenant_id', tenantId)
            .eq('status', 'in_pool')
            .is('deleted_at', null);

        if (error) throw new Error(`Failed to count pool: ${error.message}`);
        return count ?? 0;
    }

    // ─── Helpers ────────────────────────────────────────

    private mapJobToCamelCase(row: DatabaseMatchingJob): MatchingJob {
        return {
            id: row.id,
            eventId: row.event_id,
            tenantId: row.tenant_id,
            triggerAttendeeId: row.trigger_attendee_id,
            mode: row.mode,
            status: row.status as MatchingJob['status'],
            startedAt: row.started_at,
            completedAt: row.completed_at,
            error: row.error,
            resultSummary: row.result_summary as Record<string, unknown> | null,
            createdAt: row.created_at,
        };
    }
}
