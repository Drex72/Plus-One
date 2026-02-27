import { Joi } from '@/core';

const attendeePreferenceSchema = Joi.object({
    field: Joi.string().required(),
    value: Joi.array().items(Joi.any()).required(),
    type: Joi.string().valid('in', 'range').required(),
});

export const registerAttendeeSchema = {
    inputSchema: Joi.object({
        externalId: Joi.string().optional(),
        name: Joi.string().required(),
        email: Joi.string().email().optional(),
        preferences: Joi.array().items(attendeePreferenceSchema).optional(),
        profile: Joi.object().required(),
    }),

    paramsSchema: Joi.object({
        eventId: Joi.string().uuid().required(),
    }),
};

export const listAttendeesQuerySchema = {
    paramsSchema: Joi.object({
        eventId: Joi.string().uuid().required(),
    }),

    querySchema: Joi.object({
        page: Joi.number().integer().min(1).optional(),
        pageSize: Joi.number().integer().min(1).max(100).optional(),
        search: Joi.string().max(100).optional(),
    }),
};

export const updateAttendeeSchema = {
    paramsSchema: Joi.object({
        eventId: Joi.string().uuid().required(),
        attendeeId: Joi.string().uuid().required(),
    }),

    inputSchema: Joi.object({
        name: Joi.string().optional(),
        email: Joi.string().email().optional().allow(null),
        preferences: Joi.array().items(attendeePreferenceSchema).optional(),
        profile: Joi.object().optional(),
        status: Joi.string().valid('pending', 'in_pool', 'matched', 'opted_out').optional(),
    }).min(1),
};

export const deleteAttendeeSchema = {
    paramsSchema: Joi.object({
        eventId: Joi.string().uuid().required(),
        attendeeId: Joi.string().uuid().required(),
    }),
};

export const bulkRegisterSchema = {
    paramsSchema: Joi.object({
        eventId: Joi.string().uuid().required(),
    }),
    inputSchema: Joi.object({
        attendees: Joi.array()
            .items(
                Joi.object({
                    name: Joi.string().required(),
                    email: Joi.string().email().optional(),
                    externalId: Joi.string().optional(),
                    profile: Joi.object().required(),
                    preferences: Joi.array().items(attendeePreferenceSchema).optional(),
                }),
            )
            .min(1)
            .max(500)
            .required(),
    }),
};
