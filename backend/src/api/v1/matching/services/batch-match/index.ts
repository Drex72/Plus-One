import blossom from 'edmonds-blossom';
import { dispatch } from '@/app';
import { BadRequestError, BaseService, ControllerArgs, HttpStatus, logger, UnAuthorizedError } from '@/core';
import { config } from '@/core/config';
import {
    calculateMatchScore,
    pairKey,
    validateMatchingConfig,
    precomputeEmbeddings,
    clearEmbeddingCache,
    isSemanticEnabled,
    batchEnrichProfiles,
    isEnrichmentEnabled,
} from '../../engine';
import type { ScoringContext } from '../../engine';
import type { BatchMatchPayload, MatchableAttendee, MatchingConfig, ScoringResult } from '../../interfaces';
import { MatchRepository } from '../../repository';

export class BatchMatchEvent extends BaseService {
    constructor(private readonly matchRepository: MatchRepository) {
        super();
    }

    /**
     * Triggers a batch matching job for an event.
     *
     * Creates a matching job record and processes all attendee pairs:
     * 1. Validates tenant ownership of the event
     * 2. Fetches all attendees in the pool
     * 3. Generates all unique pairs (A→B only, not B→A)
     * 4. Deletes existing matches for idempotency
     * 5. Calculates scores for each pair
     * 6. Stores matches that exceed the threshold
     *
     * The job is processed inline but structured for future async/worker migration.
     */
    handle = async ({ request, params }: ControllerArgs<BatchMatchPayload>) => {
        const currentTenant = request.tenant;
        if (!currentTenant) throw new UnAuthorizedError('Invalid Tenant!');

        // Fetch event and verify tenant ownership
        const [event] = await dispatch('event:get-by-id', { eventId: params.eventId });
        if (!event) throw new BadRequestError('Event not found');
        if (event.tenantId !== currentTenant.id) throw new BadRequestError('Event not found');

        const matchingConfig = event.matchingConfig as MatchingConfig;
        if (!matchingConfig?.attributes?.length) {
            throw new BadRequestError('Event has no matching config. Configure attributes before matching.');
        }

        validateMatchingConfig(matchingConfig);

        // Transition event to 'matching' state (continuous matching mode)
        if (event.status !== 'matching') {
            await this.matchRepository.updateEventStatus(params.eventId, currentTenant.id!, 'matching');
            logger.info(`Event ${params.eventId} transitioned to 'matching' state`);
        }

        // Move all eligible attendees into the matching pool
        await this.matchRepository.moveAttendeesToPool(params.eventId, currentTenant.id!);

        // Fetch attendee pool (scoped to tenant — only 'in_pool' status)
        const pool = await this.matchRepository.getMatchPool(params.eventId, currentTenant.id!);

        if (pool.length < 2) {
            throw new BadRequestError('Not enough attendees in the pool for matching (minimum 2)');
        }

        // Create job record
        const job = await this.matchRepository.createJob({
            eventId: params.eventId,
            tenantId: currentTenant.id!,
            mode: 'batch',
        });

        logger.info(`Batch matching job ${job.id} created for event ${params.eventId} with ${pool.length} attendees`);

        // Process matching asynchronously (fire and forget)
        this.processJob(job.id, params.eventId, currentTenant.id!, pool, matchingConfig).catch((error) => {
            logger.error(`Batch matching job ${job.id} failed unexpectedly: ${error}`);
            // Last-resort job status update — processJob's own catch should have handled this,
            // but if something truly unexpected happened we try once more.
            this.matchRepository
                .updateJob(job.id, {
                    status: 'failed',
                    completedAt: new Date().toISOString(),
                    error: error instanceof Error ? error.message : String(error),
                })
                .catch(() => {
                    /* already logged inside processJob */
                });
        });

        return {
            data: { matchingJobId: job.id, status: 'queued' },
            code: HttpStatus.ACCEPTED,
            message: 'Batch matching job queued',
        };
    };

    /**
     * Processes the batch matching job using Edmonds' Blossom algorithm
     * for globally optimal maximum weight 1:1 matching.
     *
     * Pipeline:
     * 0. LLM-enrich any un-enriched profiles (lazy fallback)
     * 1. Pre-compute semantic embeddings for array_similarity fields
     * 2. Score all unique pairs O(n²)
     * 3. Filter pairs above threshold (egalitarian floor)
     * 4. Run Blossom with maxCardinality=true on filtered edges
     *    → globally optimal assignment maximizing total score
     *    → each attendee gets AT MOST one match (1:1 guarantee)
     * 5. Persist matches + cleanup
     */
    private async processJob(
        jobId: string,
        eventId: string,
        tenantId: string,
        pool: MatchableAttendee[],
        matchingConfig: MatchingConfig,
    ): Promise<void> {
        const startTime = Date.now();

        try {
            // Update job to processing
            await this.matchRepository.updateJob(jobId, {
                status: 'processing',
                startedAt: new Date().toISOString(),
            });

            const threshold = matchingConfig.matchThreshold ?? config.matching.threshold;
            const maxBatchSize = config.matching.maxBatchSize;

            // Cap pool size if necessary
            const effectivePool = pool.length > maxBatchSize ? pool.slice(0, maxBatchSize) : pool;
            if (pool.length > maxBatchSize) {
                logger.warn(`Pool size ${pool.length} exceeds max batch size ${maxBatchSize}. Processing first ${maxBatchSize} attendees.`);
            }

            const totalPairs = (effectivePool.length * (effectivePool.length - 1)) / 2;
            logger.info(`Processing ${totalPairs} pairs for job ${jobId}`);

            // Delete existing matches before re-inserting (idempotent batch runs)
            const deletedCount = await this.matchRepository.deleteMatchesByEvent(eventId, tenantId);
            if (deletedCount > 0) {
                logger.info(`Cleared ${deletedCount} existing matches for event ${eventId} before batch run`);
            }

            // ── Phase 0: LLM-enrich un-enriched profiles ────
            if (isEnrichmentEnabled()) {
                const unenriched = effectivePool.filter((a) => !a.enrichedProfile);
                if (unenriched.length > 0) {
                    logger.info(`Enriching ${unenriched.length} un-enriched profiles at match-time (lazy fallback)`);

                    // Fetch event context for better LLM prompts
                    let eventContext: { name?: string; description?: string } | undefined;
                    try {
                        const [event] = await dispatch('event:get-by-id', { eventId });
                        if (event) eventContext = { name: event.name, description: event.description ?? undefined };
                    } catch {
                        /* non-critical */
                    }

                    const enriched = await batchEnrichProfiles(unenriched, matchingConfig, eventContext);

                    // Apply enriched data to pool + persist to DB
                    const dbUpdates: Array<{ id: string; enrichedAttributes: Record<string, string[]> }> = [];
                    for (const [attId, enrichedProfile] of enriched.entries()) {
                        const attendee = effectivePool.find((a) => a.id === attId);
                        if (attendee) {
                            attendee.enrichedProfile = enrichedProfile;
                            dbUpdates.push({ id: attId, enrichedAttributes: enrichedProfile });
                        }
                    }

                    if (dbUpdates.length > 0) {
                        const saved = await this.matchRepository.batchSaveEnrichedProfiles(dbUpdates);
                        logger.info(`Enriched and saved ${saved} profiles`);
                    }
                }
            }

            // ── Phase 1: Pre-compute semantic embeddings ────
            const scoringContext: ScoringContext = { eventId };

            if (isSemanticEnabled()) {
                const arraySimilarityFields = (matchingConfig.attributes ?? [])
                    .filter((attr) => attr.type === 'array_similarity')
                    .map((attr) => attr.field);

                if (arraySimilarityFields.length > 0) {
                    // Embed enriched values (which include expanded terms)
                    const embeddedCount = await precomputeEmbeddings(effectivePool, arraySimilarityFields, eventId);
                    logger.info(`Pre-computed ${embeddedCount} embeddings for semantic similarity`);
                }
            }

            // ── Phase 2: Score all pairs ────────────────────
            // Build a vertex index: each attendee maps to an integer vertex
            const idToVertex = new Map<string, number>();
            effectivePool.forEach((a, i) => idToVertex.set(a.id, i));

            // Score all pairs and collect edges for Blossom
            const scoredPairs: Array<{
                attendeeAId: string;
                attendeeBId: string;
                score: number;
                breakdown: Record<string, number>;
            }> = [];

            const blossomEdges: Array<[number, number, number]> = [];
            const processedPairs = new Set<string>();
            let pairsScored = 0;

            for (let i = 0; i < effectivePool.length; i++) {
                for (let j = i + 1; j < effectivePool.length; j++) {
                    const attendeeA = effectivePool[i];
                    const attendeeB = effectivePool[j];

                    // Deduplicate pairs
                    const key = pairKey(attendeeA.id, attendeeB.id);
                    if (processedPairs.has(key)) continue;
                    processedPairs.add(key);

                    const { score, breakdown } = calculateMatchScore(attendeeA, attendeeB, matchingConfig, scoringContext);
                    pairsScored++;

                    if (score >= threshold) {
                        // Ensure attendeeAId < attendeeBId to satisfy ck_match_pair_order constraint
                        const [orderedA, orderedB] = attendeeA.id < attendeeB.id ? [attendeeA.id, attendeeB.id] : [attendeeB.id, attendeeA.id];

                        scoredPairs.push({
                            attendeeAId: orderedA,
                            attendeeBId: orderedB,
                            score,
                            breakdown,
                        });

                        // Add edge for Blossom: [vertexA, vertexB, weight]
                        // Blossom maximizes total weight, so we use the score directly
                        blossomEdges.push([i, j, score]);
                    }
                }
            }

            // ── Phase 3: Blossom optimal 1:1 assignment ─────
            const matchedIds = new Set<string>();
            const qualifyingMatches: Array<{
                eventId: string;
                tenantId: string;
                attendeeAId: string;
                attendeeBId: string;
                score: number;
                scoreBreakdown: Record<string, number>;
                strategy: string;
            }> = [];

            if (blossomEdges.length > 0) {
                // Run Edmonds' Blossom with maxCardinality=true:
                // 1. Maximize coverage (match as many people as possible)
                // 2. Among all max-cardinality matchings, pick the one with highest total weight
                const blossomResult = blossom(blossomEdges, true);

                // Build a lookup from scored pairs for fast retrieval
                const pairLookup = new Map<string, (typeof scoredPairs)[0]>();
                for (const pair of scoredPairs) {
                    pairLookup.set(`${pair.attendeeAId}:${pair.attendeeBId}`, pair);
                }

                // Convert Blossom result to matches
                // blossomResult[i] = j means vertex i is matched to vertex j (-1 = unmatched)
                const processedVertices = new Set<number>();
                for (let v = 0; v < blossomResult.length; v++) {
                    const mate = blossomResult[v];
                    if (mate === -1 || processedVertices.has(v) || processedVertices.has(mate)) continue;

                    processedVertices.add(v);
                    processedVertices.add(mate);

                    const attA = effectivePool[v];
                    const attB = effectivePool[mate];

                    // Look up the scored pair (with ordered IDs)
                    const [orderedA, orderedB] = attA.id < attB.id ? [attA.id, attB.id] : [attB.id, attA.id];

                    const pairData = pairLookup.get(`${orderedA}:${orderedB}`);
                    if (!pairData) continue; // Should not happen, but guard

                    matchedIds.add(orderedA);
                    matchedIds.add(orderedB);

                    qualifyingMatches.push({
                        eventId,
                        tenantId,
                        attendeeAId: orderedA,
                        attendeeBId: orderedB,
                        score: pairData.score,
                        scoreBreakdown: pairData.breakdown,
                        strategy: 'blossom_max_weight',
                    });
                }
            }

            logger.info(
                `Blossom optimal matching: ${scoredPairs.length} edges above threshold → ` +
                    `${qualifyingMatches.length} optimal matches (${matchedIds.size} attendees matched)`,
            );

            // ── Phase 4: Persist matches ────────────────────
            let insertedCount = 0;
            if (qualifyingMatches.length > 0) {
                insertedCount = await this.matchRepository.createManyMatches(qualifyingMatches);

                // Update matched attendees' status to 'matched'
                await this.matchRepository.updateAttendeeStatuses(Array.from(matchedIds), 'matched');
            }

            // Clean up embedding cache for this event
            clearEmbeddingCache(eventId);

            const elapsedMs = Date.now() - startTime;

            logger.info(
                `Batch matching job ${jobId} completed: ` +
                    `${pairsScored} pairs scored, ${qualifyingMatches.length} 1:1 matches stored, ${elapsedMs}ms elapsed`,
            );

            // Update job to completed
            await this.matchRepository.updateJob(jobId, {
                status: 'completed',
                completedAt: new Date().toISOString(),
                resultSummary: {
                    totalAttendees: effectivePool.length,
                    totalPairsScored: pairsScored,
                    pairsAboveThreshold: scoredPairs.length,
                    matchesAssigned: qualifyingMatches.length,
                    attendeesMatched: matchedIds.size,
                    matchesStored: insertedCount,
                    threshold,
                    semanticEnabled: isSemanticEnabled(),
                    enrichmentEnabled: isEnrichmentEnabled(),
                    strategy: 'blossom_max_weight',
                    elapsedMs,
                },
            });

            // Auto-stop matching if the pool is now empty
            const remainingPool = await this.matchRepository.getPoolCount(eventId, tenantId);
            if (remainingPool === 0) {
                await this.matchRepository.updateEventStatus(eventId, tenantId, 'completed');
                logger.info(`Event ${eventId} automatically transitioned to 'completed' — pool is empty`);
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            logger.error(`Batch matching job ${jobId} failed: ${errorMessage}`);

            // Clean up embedding cache even on failure
            clearEmbeddingCache(eventId);

            await this.matchRepository
                .updateJob(jobId, {
                    status: 'failed',
                    completedAt: new Date().toISOString(),
                    error: errorMessage,
                })
                .catch((updateErr) => {
                    logger.error(`Failed to update job ${jobId} status: ${updateErr}`);
                });
        }
    }
}

const batchMatchInstance = new BatchMatchEvent(new MatchRepository());
export default batchMatchInstance;
