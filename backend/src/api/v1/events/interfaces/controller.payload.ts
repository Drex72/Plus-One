import type { ControllerArgsTypes } from '@/core/handlers';
import { Event, MatchingConfig } from './module.types';

export interface CreateEventInput {
    name: string;
    description?: string;
    matchingConfig: MatchingConfig;
    startsAt?: string;
    endsAt?: string;
}

export interface CreateEventPayload extends ControllerArgsTypes {
    input: CreateEventInput;
}

export interface GetEventPayload extends ControllerArgsTypes {
    params: { eventId: string };
}

export interface ListEventsPayload extends ControllerArgsTypes {
    query: {
        page?: number;
        pageSize?: number;
        search?: string;
    };
}

export interface UpdateEventPayload extends ControllerArgsTypes {
    params: { eventId: string };
    input: Partial<Event>;
}
