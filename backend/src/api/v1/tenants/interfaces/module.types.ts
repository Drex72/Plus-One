import { DatabaseTable, Json } from '@/core/types';

export type DatabaseTenant = DatabaseTable['tenants']['Row'];

export type Tenant = {
    id: string;
    name: string;
    apiKey: string;
    webhookEndpoint: string | null;
    metadata: Json;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
};

export interface CreateTenantInput {
    name: string;
    webhookEndpoint?: string;
    metadata?: Json;
}
