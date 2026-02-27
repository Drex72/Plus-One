import { BaseRepository, supabaseAdmin } from '@/core';
import { Json } from '@/core/types';
import type { CreateEventInput, DatabaseEvent, Event } from '../interfaces';

export class EventRepository extends BaseRepository<DatabaseEvent, Event> {
    protected readonly table = 'events';

    async createEvent(tenantId: string, input: CreateEventInput): Promise<Event> {
        const { data, error } = await supabaseAdmin
            .from(this.table)
            .insert({
                tenant_id: tenantId,
                name: input.name,
                description: input.description ?? null,
                matching_config: input.matchingConfig as unknown as Json,
                status: 'draft',
                starts_at: input.startsAt ?? null,
                ends_at: input.endsAt ?? null,
            })
            .select()
            .single();

        if (error) throw new Error(`Failed to create event: ${error.message}`);

        return this.mapToCamelCase(data);
    }
}
