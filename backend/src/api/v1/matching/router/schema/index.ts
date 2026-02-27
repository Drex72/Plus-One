import { Joi } from '@/core';

export const findMatchesSchema = {
    paramsSchema: Joi.object({
        eventId: Joi.string().uuid().required(),
    }),
    inputSchema: Joi.object({
        attendeeId: Joi.string().uuid().required(),
        limit: Joi.number().integer().min(1).max(100).optional(),
        includeBreakdown: Joi.boolean().optional(),
        excludeIds: Joi.array().items(Joi.string().uuid()).optional(),
    }),
};

export const batchMatchSchema = {
    paramsSchema: Joi.object({
        eventId: Joi.string().uuid().required(),
    }),
};

export const getMatchesSchema = {
    paramsSchema: Joi.object({
        eventId: Joi.string().uuid().required(),
    }),
    querySchema: Joi.object({
        page: Joi.number().integer().min(1).optional(),
        pageSize: Joi.number().integer().min(1).max(100).optional(),
        attendeeId: Joi.string().uuid().optional(),
    }),
};

export const getJobStatusSchema = {
    paramsSchema: Joi.object({
        eventId: Joi.string().uuid().required(),
        jobId: Joi.string().uuid().required(),
    }),
};

export const updateMatchStatusSchema = {
    paramsSchema: Joi.object({
        eventId: Joi.string().uuid().required(),
        matchId: Joi.string().uuid().required(),
    }),
    inputSchema: Joi.object({
        status: Joi.string().valid('confirmed', 'rejected').required(),
    }),
};

export const listJobsSchema = {
    paramsSchema: Joi.object({
        eventId: Joi.string().uuid().required(),
    }),
    querySchema: Joi.object({
        page: Joi.number().integer().min(1).optional(),
        pageSize: Joi.number().integer().min(1).max(100).optional(),
    }),
};

export const getDashboardStatsSchema = {
    querySchema: Joi.object({
        from: Joi.string().isoDate().optional(),
        to: Joi.string().isoDate().optional(),
    }),
};

export const stopMatchingSchema = {
    paramsSchema: Joi.object({
        eventId: Joi.string().uuid().required(),
    }),
};
