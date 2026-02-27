import { Joi } from '@/core';

export const createTenantSchema = {
    inputSchema: Joi.object({
        name: Joi.string().min(1).max(255).required(),
        webhook_endpoint: Joi.string().uri().optional().allow(null),
        metadata: Joi.object().optional(),
    }),
}

export const updateTenantSchema = {
    inputSchema: Joi.object({
        name: Joi.string().min(1).max(255).optional(),
        webhook_endpoint: Joi.string().uri().optional().allow(null),
        metadata: Joi.object().optional(),
    }),
};