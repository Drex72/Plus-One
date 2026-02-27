import { BadRequestError, HttpStatus } from '@/core';
import type { ControllerArgsTypes } from '@/core/handlers';

export class GetCurrentTenant {
    constructor() {}

    handle = async ({ request }: ControllerArgsTypes) => {
        if (!request.tenant) throw new BadRequestError('Tenant not found on request');

        return {
            code: HttpStatus.OK,
            message: 'Tenant retrieved',
            data: request.tenant,
        };
    };
}

const getCurrentTenant = new GetCurrentTenant();
export default getCurrentTenant;
