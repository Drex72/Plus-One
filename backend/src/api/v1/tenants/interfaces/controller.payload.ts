import type { ControllerArgsTypes } from '@/core/handlers';
import { CreateTenantInput } from './module.types';

export interface CreateTenantPayload extends ControllerArgsTypes {
    input: CreateTenantInput;
}

export interface UpdateTenantPayload extends ControllerArgsTypes {
    input: Partial<CreateTenantInput>;
}

export interface GetTenantPayload extends ControllerArgsTypes {
    params: { tenantId: string };
}
