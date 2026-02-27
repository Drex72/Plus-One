import { BaseService, ControllerArgs, HttpStatus, UnAuthorizedError, logger } from '@/core';
import { TenantRepository } from '../../repository';

interface RotateKeyPayload {
    params: Record<string, never>;
}

export class RotateApiKey extends BaseService {
    constructor(private readonly tenantRepository: TenantRepository) {
        super();
    }

    handle = async ({ request }: ControllerArgs<RotateKeyPayload>) => {
        const currentTenant = request.tenant;
        if (!currentTenant) throw new UnAuthorizedError('Invalid Tenant!');

        const tenant = await this.tenantRepository.rotateApiKey(currentTenant.id!);

        logger.info(`API key rotated for tenant ${currentTenant.id}`);

        return {
            data: tenant,
            code: HttpStatus.OK,
            message: 'API key rotated successfully. Update your integrations with the new key.',
        };
    };
}

const rotateApiKeyInstance = new RotateApiKey(new TenantRepository());
export default rotateApiKeyInstance;
