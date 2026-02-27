import winston from 'winston';
import { Event } from '~/events/interfaces';
import { Tenant } from '~/tenants/interfaces';

interface EventDefinition<Data = any, Return = any> {
    data: Data;
    return: Return;
}

export type EventRegister = {
    [K in keyof AppEventsInterface]: AppEventsInterface[K]['data'];
};

export interface AppEventsInterface {
    'app:up': EventDefinition<void, void>;
    'cache:connection:established': EventDefinition<void, winston.Logger>;
    'event:registration:successful': EventDefinition<void, winston.Logger>;

    // Tenant
    'tenant:get-by-api-key': EventDefinition<{ apiKey: string }, Partial<Tenant> | null>;

    // Event
    'event:get-by-id': EventDefinition<{ eventId: string }, Event | null>;
}
