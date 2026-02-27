import { Joi } from '@/core';

const attributeConfigSchema = Joi.object({
    field: Joi.string().required(),
    type: Joi.string().valid('array_similarity', 'ordinal', 'exact', 'numeric').required(),
    weight: Joi.number().min(0).max(1).required(),
    config: Joi.object({
        scale: Joi.array().items(Joi.string()).min(2),
        maxDistance: Joi.number(),
    }).optional(),
}).custom((attribute) => {
    const { type, config } = attribute;

    if (requiresConfig(type) && !config) {
        throw new Error(`config is required when type is ${type}`);
    }

    if (config) {
        if (type === 'ordinal') {
            validateOrdinalConfig(config);
        }
        if (type === 'numeric') {
            validateNumericConfig(config);
        }
    }

    return attribute;
});

const constraintRuleSchema = Joi.object({
    field: Joi.string().required(),
    operator: Joi.string().valid('eq', 'neq', 'in', 'not_in', 'range', 'gte', 'lte').required(),
    value: Joi.any().required(),
    type: Joi.string().valid('hard', 'soft').required(),
});

const matchingConfigSchema = Joi.object({
    matchThreshold: Joi.number().min(0).max(100).optional(),
    requiredFields: Joi.array().items(Joi.string().required()).min(1).required(),
    attributes: Joi.array().items(attributeConfigSchema).min(1).required(),
    constraints: Joi.array().items(constraintRuleSchema).default([]),
}).custom((matchingConfig) => {
    const { requiredFields, attributes = [], constraints = [] } = matchingConfig;

    validateFieldsExist(attributes, requiredFields, 'Attribute');

    validateFieldsExist(constraints, requiredFields, 'Constraint');

    return matchingConfig;
});

/**
 * Validates that all fields referenced in items exist in requiredFields array
 *
 * @example
 * requiredFields = ['name', 'age']
 * items = [{ field: 'name' }, { field: 'location' }]
 * // Throws: "Attribute field(s) not in requiredFields: location"
 */
const validateFieldsExist = (items: Array<{ field: string }>, requiredFields: string[], itemType: string): void => {
    const itemFields = items.map((item) => item.field);
    const invalidFields = itemFields.filter((field) => !requiredFields.includes(field));

    if (invalidFields.length > 0) {
        throw new Error(`${itemType} field(s) not in requiredFields: ${invalidFields.join(', ')}`);
    }
};

const validateOrdinalConfig = (config: any): void => {
    if (!config.scale || config.scale.length === 0) {
        throw new Error('scale is required when type is ordinal');
    }
};

const validateNumericConfig = (config: any): void => {
    if (config.maxDistance === undefined) {
        throw new Error('maxDistance is required when type is numeric');
    }
};

const requiresConfig = (type: string): boolean => {
    return type === 'ordinal' || type === 'numeric';
};

export const createEventSchema = {
    inputSchema: Joi.object({
        name: Joi.string().min(1).max(255).required(),
        description: Joi.string().max(2000).optional().allow(null),
        matchingConfig: matchingConfigSchema.optional(),
        startsAt: Joi.string().isoDate().optional().allow(null),
        endsAt: Joi.string().isoDate().optional().allow(null),
    }),
};

export const updateEventSchema = {
    paramsSchema: Joi.object({
        eventId: Joi.string().uuid().required(),
    }),

    inputSchema: Joi.object({
        name: Joi.string().min(1).max(255).optional(),
        description: Joi.string().max(2000).optional().allow(null),
        matchingConfig: matchingConfigSchema.optional(),
        status: Joi.string().valid('draft', 'active', 'matching', 'completed', 'archived').optional(),
        startsAt: Joi.string().isoDate().optional().allow(null),
        endsAt: Joi.string().isoDate().optional().allow(null),
    }).min(1),
};

export const eventParamsSchema = {
    paramsSchema: Joi.object({
        eventId: Joi.string().uuid().required(),
    }),
};

export const listEventsQuerySchema = {
    querySchema: Joi.object({
        page: Joi.number().integer().min(1).optional(),
        pageSize: Joi.number().integer().min(1).max(100).optional(),
        search: Joi.string().max(100).optional(),
    }),
};
