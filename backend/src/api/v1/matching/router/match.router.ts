import { ControlBuilder } from '@/core';
import { Router } from 'express';
import {
    batchMatch,
    findMatches,
    getMatches,
    getJobStatus,
    updateMatchStatus,
    listJobs,
    getDashboardStats,
    stopMatching,
} from '../services';
import {
    batchMatchSchema,
    findMatchesSchema,
    getMatchesSchema,
    getJobStatusSchema,
    updateMatchStatusSchema,
    listJobsSchema,
    getDashboardStatsSchema,
    stopMatchingSchema,
} from './schema';

export const matchRouter = Router();

/**
 * GET /dashboard/stats
 * Dashboard aggregate stats for the tenant.
 */
matchRouter.get(
    '/dashboard/stats',
    ControlBuilder.builder()
        .isPrivate()
        .setValidator(getDashboardStatsSchema)
        .setHandler(getDashboardStats.handle)
        .handle(),
);

/**
 * POST /:eventId/match
 * Trigger batch matching for all attendees in the event pool.
 */
matchRouter.post(
    '/:eventId/match',
    ControlBuilder.builder()
        .isPrivate()
        .setValidator(batchMatchSchema)
        .setHandler(batchMatch.handle)
        .handle(),
);

/**
 * POST /:eventId/match/find
 * Find real-time matches for a specific attendee.
 */
matchRouter.post(
    '/:eventId/match/find',
    ControlBuilder.builder()
        .isPrivate()
        .setValidator(findMatchesSchema)
        .setHandler(findMatches.handle)
        .handle(),
);

/**
 * GET /:eventId/matches
 * Retrieve stored matches for an event.
 */
matchRouter.get(
    '/:eventId/matches',
    ControlBuilder.builder()
        .isPrivate()
        .setValidator(getMatchesSchema)
        .setHandler(getMatches.handle)
        .handle(),
);

/**
 * PATCH /:eventId/matches/:matchId
 * Update match status (confirm / reject).
 */
matchRouter.patch(
    '/:eventId/matches/:matchId',
    ControlBuilder.builder()
        .isPrivate()
        .setValidator(updateMatchStatusSchema)
        .setHandler(updateMatchStatus.handle)
        .handle(),
);

/**
 * GET /:eventId/match/jobs/:jobId
 * Retrieve the status of a batch matching job.
 */
matchRouter.get(
    '/:eventId/match/jobs/:jobId',
    ControlBuilder.builder()
        .isPrivate()
        .setValidator(getJobStatusSchema)
        .setHandler(getJobStatus.handle)
        .handle(),
);

/**
 * GET /:eventId/jobs
 * List all matching jobs for an event.
 */
matchRouter.get(
    '/:eventId/jobs',
    ControlBuilder.builder()
        .isPrivate()
        .setValidator(listJobsSchema)
        .setHandler(listJobs.handle)
        .handle(),
);

/**
 * POST /:eventId/match/stop
 * Stop continuous matching for an event.
 */
matchRouter.post(
    '/:eventId/match/stop',
    ControlBuilder.builder()
        .isPrivate()
        .setValidator(stopMatchingSchema)
        .setHandler(stopMatching.handle)
        .handle(),
);
