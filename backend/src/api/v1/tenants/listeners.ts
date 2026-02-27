import { TenantRepository } from './repository';

export async function getTenantByApiKeyEventListener(apiKey: string) {
    const tenantRepository = new TenantRepository();
    const existingTenant = await tenantRepository.findByApiKey(apiKey);
    if (!existingTenant) return null;

    return existingTenant;
}
