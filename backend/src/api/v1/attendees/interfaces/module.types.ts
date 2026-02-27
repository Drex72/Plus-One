import { DatabaseTable } from '@/core/types';

export type DatabaseAttendee = DatabaseTable['attendees']['Row'];

export interface AttendeePreference {
    field: string;
    value: any[];
    type: 'in' | 'range';
}

export type Attendee = {
    id: string;
    eventId: string;
    tenantId: string;
    externalId: string | null;
    name: string;
    email: string | null;
    preferences: AttendeePreference[];
    status: 'pending' | 'in_pool' | 'matched' | 'opted_out';
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
};

export interface UpdateAttendeeInput {
    name?: string;
    email?: string;
    preferences?: AttendeePreference[];
    profile: Record<string, any>;
    status?: Attendee['status'];
}
