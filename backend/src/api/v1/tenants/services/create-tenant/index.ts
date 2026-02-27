import { BadRequestError, BaseService, ConflictError, ControllerArgs, HttpStatus, logger } from '@/core';
import { CreateTenantPayload } from '../../interfaces';
import { TenantRepository } from '../../repository';

export class CreateTenant extends BaseService {
    constructor(private readonly tenantRepository: TenantRepository) {
        super();
    }

    handle = async ({ input }: ControllerArgs<CreateTenantPayload>) => {
        if (!input) throw new BadRequestError(`Invalid credentials`);

        const { name, webhookEndpoint, metadata = {} } = input;

        const tenantExists = await this.tenantRepository.findByName(name.toLocaleLowerCase());

        if (tenantExists) {
            throw new ConflictError('Tenant already exists. Please log in instead.');
        }

        const tenant = await this.tenantRepository.createTenant({
            name: name.toLocaleLowerCase(),
            webhookEndpoint,
            metadata,
        });

        logger.info('Tenant Account Created Successfully');

        return {
            data: tenant,
            code: HttpStatus.CREATED,
            message: 'Tenant Created Successfully',
        };
    };
}

const createTenantInstance = new CreateTenant(new TenantRepository());
export default createTenantInstance;
