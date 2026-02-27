import type { ControllerArgsTypes } from '@/core/handlers';
import { AttendeePreference } from './module.types';

export interface CreateAttendeeInput {
    externalId?: string;
    name: string;
    email?: string;
    preferences?: AttendeePreference[];
    profile: Record<string, any>;
}

export interface RegisterAttendeePayload extends ControllerArgsTypes {
    params: { eventId: string };
    input: CreateAttendeeInput;
}

export interface ListAttendeesPayload extends ControllerArgsTypes {
    params: { eventId: string };
    query: { page?: number; pageSize?: number; search?: string };
}

export interface GetAttendeePayload extends ControllerArgsTypes {
    params: { eventId: string; attendeeId: string };
}

export interface UpdateAttendeePayload extends ControllerArgsTypes {
    params: { eventId: string; attendeeId: string };
    input: {
        name?: string;
        email?: string;
        preferences?: AttendeePreference[];
        profile?: Record<string, any>;
        status?: 'pending' | 'in_pool' | 'matched' | 'opted_out';
    };
}

export interface DeleteAttendeePayload extends ControllerArgsTypes {
    params: { eventId: string; attendeeId: string };
}
