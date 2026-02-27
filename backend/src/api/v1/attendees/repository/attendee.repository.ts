import { BaseRepository, supabaseAdmin } from '@/core';
import type { Attendee, CreateAttendeeInput, DatabaseAttendee } from '../interfaces';

export class AttendeeRepository extends BaseRepository<DatabaseAttendee, Attendee> {
    protected readonly table = 'attendees';

    async createAttendee(eventId: string, tenantId: string, input: CreateAttendeeInput): Promise<Attendee> {
        const { data, error } = await supabaseAdmin
            .from(this.table)
            .insert({
                event_id: eventId,
                tenant_id: tenantId,
                external_id: input.externalId ?? null,
                name: input.name,
                email: input.email ?? null,
                preferences: input.preferences ?? {},
                attributes: input.profile ?? {},
                status: 'pending',
            })
            .select()
            .single();

        if (error) throw new Error(`Failed to create attendee: ${error.message}`);

        return this.mapToCamelCase(data);
    }

    async getPool(eventId: string, tenantId: string): Promise<Attendee[]> {
        const { data, error } = await supabaseAdmin
            .from(this.table)
            .select()
            .eq('event_id', eventId)
            .eq('tenant_id', tenantId)
            .eq('status', 'in_pool')
            .is('deleted_at', null)
            .order('created_at', { ascending: true });

        if (error) throw new Error(`Failed to get attendee pool: ${error.message}`);

        const formattedData = data.map(this.mapToCamelCase);

        return formattedData;
    }
}
