import { BaseRepository, supabaseAdmin } from '@/core';
import crypto from 'crypto';
import { CreateTenantInput, DatabaseTenant, Tenant } from '../interfaces';

export class TenantRepository extends BaseRepository<DatabaseTenant, Tenant> {
    protected readonly table = 'tenants';

    constructor() {
        super();
    }

    async createTenant(input: CreateTenantInput): Promise<Tenant> {
        const apiKey = `po_${crypto.randomBytes(32).toString('hex')}`;

        const { data, error } = await supabaseAdmin
            .from(this.table)
            .insert({
                name: input.name,
                api_key: apiKey,
                webhook_endpoint: input.webhookEndpoint ?? null,
                metadata: input.metadata ?? null,
            })
            .select()
            .single();

        if (error) throw new Error(`Failed to create tenant: ${error.message}`);

        return this.mapToCamelCase(data);
    }

    async findByApiKey(apiKey: string): Promise<Tenant | null> {
        const { data, error } = await supabaseAdmin.from(this.table).select().eq('api_key', apiKey).is('deleted_at', null).single();

        if (error) return null;

        return this.mapToCamelCase(data);
    }

    async findByName(name: string): Promise<Tenant | null> {
        const { data, error } = await supabaseAdmin.from(this.table).select().eq('name', name).is('deleted_at', null).single();

        if (error) return null;

        return this.mapToCamelCase(data);
    }

    async rotateApiKey(tenantId: string): Promise<Tenant> {
        const newApiKey = `po_${crypto.randomBytes(32).toString('hex')}`;

        const { data, error } = await supabaseAdmin.from(this.table).update({ api_key: newApiKey }).eq('id', tenantId).select().single();

        if (error) throw new Error(`Failed to rotate API key: ${error.message}`);

        return this.mapToCamelCase(data);
    }
}
