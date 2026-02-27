import { ControlBuilder } from '@/core';
import { Router } from 'express';
import {
    createTenant,
    getTenant,
    updateTenant,
    rotateApiKey,
} from '../services';
import { createTenantSchema, updateTenantSchema } from './schema';

export const tenantRouter = Router();

tenantRouter.post(
    '/',
    ControlBuilder.builder()
        .setValidator(createTenantSchema)
        .setHandler(createTenant.handle)
        .handle(),
);

tenantRouter.get(
    '/me',
    ControlBuilder.builder().isPrivate().setHandler(getTenant.handle).handle(),
);

tenantRouter.patch(
    '/me',
    ControlBuilder.builder()
        .setValidator(updateTenantSchema)
        .setHandler(updateTenant.handle)
        .handle(),
);

tenantRouter.post(
    '/me/rotate-key',
    ControlBuilder.builder()
        .isPrivate()
        .setHandler(rotateApiKey.handle)
        .handle(),
);
