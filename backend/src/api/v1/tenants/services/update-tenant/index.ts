import { BadRequestError, ControllerArgs, HttpStatus } from '@/core';
import { UpdateTenantPayload } from '../../interfaces';
import { TenantRepository } from '../../repository';

export class UpdateCurrentTenant {
    constructor(private readonly tenantRepository: TenantRepository) {}

    handle = async ({ input, request }: ControllerArgs<UpdateTenantPayload>) => {
        const { metadata, name, webhookEndpoint } = input;

        const currentTenant = request.tenant;

        if (!currentTenant) throw new BadRequestError(`No Tenant Found!`);

        const updatedTenant = await this.tenantRepository.updateById(currentTenant?.id!, {
            metadata,
            name: name?.toLocaleLowerCase(),
            webhookEndpoint,
        });

        return {
            code: HttpStatus.OK,
            message: 'Tenant Updated Successfully',
            data: updatedTenant,
        };
    };
}

const updateCurrentTenant = new UpdateCurrentTenant(new TenantRepository());
export default updateCurrentTenant;
