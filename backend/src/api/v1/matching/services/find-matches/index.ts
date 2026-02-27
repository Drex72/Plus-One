import { dispatch } from '@/app';
import { BadRequestError, BaseService, ControllerArgs, HttpStatus, logger, UnAuthorizedError } from '@/core';
import { config } from '@/core/config';
import {
    calculateMatchScore,
    shuffleArray,
    validateMatchingConfig,
    precomputeEmbeddings,
    clearEmbeddingCache,
    isSemanticEnabled,
} from '../../engine';
import type { ScoringContext } from '../../engine';
import type { FindMatchesPayload, MatchingConfig, MatchResult } from '../../interfaces';
import { MatchRepository } from '../../repository';

/** Maximum number of candidates to score per request. */
const MAX_CANDIDATES = 500;

export class FindMatches extends BaseService {
    constructor(private readonly matchRepository: MatchRepository) {
        super();
    }

    /**
     * Finds the best matches for a specific attendee within an event.
     *
     * Flow:
     * 1. Validate tenant and fetch event
     * 2. Fetch the target attendee
     * 3. Pre-filter candidate pool from database
     * 4. Score each candidate using calculateMatchScore
     * 5. Filter by threshold, sort by score descending
     * 6. Return top N matches
     */
    handle = async ({ input, request, params }: ControllerArgs<FindMatchesPayload>) => {
        const currentTenant = request.tenant;
        if (!currentTenant) throw new UnAuthorizedError('Invalid Tenant!');

        const { attendeeId, limit, includeBreakdown = false, excludeIds = [] } = input;

        // Fetch event and verify tenant ownership
        const [event] = await dispatch('event:get-by-id', { eventId: params.eventId });
        if (!event) throw new BadRequestError('Event not found');
        if (event.tenantId !== currentTenant.id) throw new BadRequestError('Event not found');

        const matchingConfig = event.matchingConfig as MatchingConfig;
        if (!matchingConfig?.attributes?.length) {
            throw new BadRequestError('Event has no matching config. Configure attributes before matching.');
        }

        validateMatchingConfig(matchingConfig);

        // Fetch target attendee (scoped to tenant)
        const attendee = await this.matchRepository.getMatchableAttendee(attendeeId, currentTenant.id!);
        if (!attendee) throw new BadRequestError('Attendee not found');
        if (attendee.eventId !== params.eventId) {
            throw new BadRequestError('Attendee does not belong to this event');
        }

        // Fetch candidate pool (excluding the attendee itself and any excluded IDs)
        const allExcluded = [attendeeId, ...excludeIds];
        let candidates = await this.matchRepository.getMatchPool(params.eventId, currentTenant.id!, allExcluded);

        // Shuffle to avoid registration-order bias before capping
        shuffleArray(candidates);

        // Cap the candidate pool to prevent excessive computation
        if (candidates.length > MAX_CANDIDATES) {
            logger.info(`Candidate pool capped from ${candidates.length} to ${MAX_CANDIDATES} for attendee ${attendeeId}`);
            candidates = candidates.slice(0, MAX_CANDIDATES);
        }

        logger.info(`Scoring ${candidates.length} candidates for attendee ${attendeeId}`);

        // Pre-compute semantic embeddings for this scoring session
        const scoringContext: ScoringContext = { eventId: params.eventId };

        if (isSemanticEnabled()) {
            const arraySimilarityFields = (matchingConfig.attributes ?? [])
                .filter((attr) => attr.type === 'array_similarity')
                .map((attr) => attr.field);

            if (arraySimilarityFields.length > 0) {
                await precomputeEmbeddings([attendee, ...candidates], arraySimilarityFields, params.eventId);
            }
        }

        // Score each candidate
        const threshold = matchingConfig.matchThreshold ?? config.matching.threshold;
        const maxResults = limit ?? 20;

        const results: MatchResult[] = [];

        for (const candidate of candidates) {
            const { score, breakdown } = calculateMatchScore(attendee, candidate, matchingConfig, scoringContext);

            if (score >= threshold) {
                results.push({
                    attendee: candidate,
                    score,
                    breakdown: includeBreakdown ? breakdown : undefined,
                });
            }
        }

        // Clean up embedding cache
        clearEmbeddingCache(params.eventId);

        // Sort by score descending and limit
        results.sort((a, b) => b.score - a.score);
        const topResults = results.slice(0, maxResults);

        logger.info(`Found ${topResults.length} matches above threshold ${threshold} for attendee ${attendeeId}`);

        return {
            data: topResults,
            code: HttpStatus.OK,
            message: 'Matches Found Successfully',
        };
    };
}

const findMatchesInstance = new FindMatches(new MatchRepository());
export default findMatchesInstance;
