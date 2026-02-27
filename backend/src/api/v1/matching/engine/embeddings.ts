import OpenAI from 'openai';
import { config } from '@/core/config';
import { logger } from '@/core';

/** The embedding model to use. text-embedding-3-small is fast, cheap, and 1536-dim. */
const EMBEDDING_MODEL = 'text-embedding-3-small';

/** Maximum batch size for OpenAI embedding requests (API limit). */
const EMBEDDING_BATCH_SIZE = 2048;

/**
 * In-memory cache of embeddings, scoped per event.
 * Key: `eventId:fieldValue`, Value: number[] (the embedding vector).
 */
const embeddingCache = new Map<string, number[]>();

/**
 * Returns an OpenAI client if the API key is configured, otherwise null.
 * This allows the system to degrade gracefully when no key is set.
 */
function getOpenAIClient(): OpenAI | null {
    if (!config.openai.apiKey) {
        return null;
    }
    return new OpenAI({ apiKey: config.openai.apiKey });
}

/**
 * Computes cosine similarity between two vectors.
 *
 * @returns A value between -1 and 1 (1 = identical, 0 = orthogonal, -1 = opposite).
 *          For normalized embedding vectors, result is typically between 0 and 1.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;

    return dotProduct / denominator;
}

/**
 * Pre-computes embeddings for all unique string values across a pool of attendees.
 *
 * Scans the specified fields in every attendee's profile, collects unique values,
 * and batch-embeds them via OpenAI. Results are cached in memory so that
 * `getSemanticSimilarity` can return results instantly during scoring.
 *
 * @param pool - All attendees that will be scored
 * @param fields - The profile field names to embed (typically array_similarity fields)
 * @param eventId - Used as a cache namespace
 * @returns The number of unique values that were embedded (0 if OpenAI is unavailable)
 */
export async function precomputeEmbeddings(
    pool: Array<{ profile: Record<string, unknown>; enrichedProfile?: Record<string, string[]> | null }>,
    fields: string[],
    eventId: string,
): Promise<number> {
    const openai = getOpenAIClient();
    if (!openai) {
        logger.info('OpenAI API key not configured — semantic similarity disabled, falling back to Jaccard');
        return 0;
    }

    // Collect all unique string values from the specified fields
    // Include both raw profile AND enriched profile values
    const uniqueValues = new Set<string>();
    for (const attendee of pool) {
        for (const field of fields) {
            // Raw profile values
            const value = attendee.profile[field];
            if (Array.isArray(value)) {
                for (const item of value) {
                    if (typeof item === 'string' && item.trim()) {
                        uniqueValues.add(item.trim().toLowerCase());
                    }
                }
            } else if (typeof value === 'string' && value.trim()) {
                uniqueValues.add(value.trim().toLowerCase());
            }

            // Enriched profile values (expanded terms)
            const enrichedValue = attendee.enrichedProfile?.[field];
            if (Array.isArray(enrichedValue)) {
                for (const item of enrichedValue) {
                    if (typeof item === 'string' && item.trim()) {
                        uniqueValues.add(item.trim().toLowerCase());
                    }
                }
            }
        }
    }

    // Filter out values already in cache
    const toEmbed: string[] = [];
    for (const val of uniqueValues) {
        const cacheKey = `${eventId}:${val}`;
        if (!embeddingCache.has(cacheKey)) {
            toEmbed.push(val);
        }
    }

    if (toEmbed.length === 0) {
        logger.info(`All ${uniqueValues.size} unique values already cached for event ${eventId}`);
        return uniqueValues.size;
    }

    logger.info(`Embedding ${toEmbed.length} unique values for event ${eventId} (${uniqueValues.size} total unique)`);

    // Batch embed in chunks of EMBEDDING_BATCH_SIZE
    for (let i = 0; i < toEmbed.length; i += EMBEDDING_BATCH_SIZE) {
        const batch = toEmbed.slice(i, i + EMBEDDING_BATCH_SIZE);

        try {
            const response = await openai.embeddings.create({
                model: EMBEDDING_MODEL,
                input: batch,
            });

            for (let j = 0; j < response.data.length; j++) {
                const cacheKey = `${eventId}:${batch[j]}`;
                embeddingCache.set(cacheKey, response.data[j].embedding);
            }

            logger.debug(`Embedded batch ${Math.floor(i / EMBEDDING_BATCH_SIZE) + 1}: ${batch.length} values`);
        } catch (error) {
            logger.error(`Embedding batch failed: ${error}`);
            // Continue with remaining batches — partial embeddings are better than none
        }
    }

    return toEmbed.length;
}

/**
 * Computes semantic similarity between two arrays of strings using pre-computed embeddings.
 *
 * For each value in array A, finds the most similar value in array B (and vice versa),
 * then returns the average of the best matches. This handles cases like:
 * - A: ["basketball", "running"] vs B: ["sports", "fitness"] → high similarity
 *
 * @param a - First array of string values
 * @param b - Second array of string values
 * @param eventId - Cache namespace
 * @returns Similarity score between 0 and 1, or null if embeddings are unavailable
 */
export function getSemanticSimilarity(a: string[], b: string[], eventId: string): number | null {
    if (!a?.length || !b?.length) return null;

    const normalizedA = a.map((v) => v.trim().toLowerCase());
    const normalizedB = b.map((v) => v.trim().toLowerCase());

    // Look up all embeddings
    const embeddingsA: Array<{ value: string; embedding: number[] }> = [];
    const embeddingsB: Array<{ value: string; embedding: number[] }> = [];

    for (const val of normalizedA) {
        const emb = embeddingCache.get(`${eventId}:${val}`);
        if (emb) embeddingsA.push({ value: val, embedding: emb });
    }
    for (const val of normalizedB) {
        const emb = embeddingCache.get(`${eventId}:${val}`);
        if (emb) embeddingsB.push({ value: val, embedding: emb });
    }

    // If we have less than half of embeddings, fall back to null (use Jaccard)
    if (embeddingsA.length < normalizedA.length / 2 || embeddingsB.length < normalizedB.length / 2) {
        return null;
    }

    if (embeddingsA.length === 0 || embeddingsB.length === 0) return null;

    // For each item in A, find the best matching item in B
    let totalSim = 0;
    let count = 0;

    for (const ea of embeddingsA) {
        let bestSim = 0;
        for (const eb of embeddingsB) {
            const sim = cosineSimilarity(ea.embedding, eb.embedding);
            if (sim > bestSim) bestSim = sim;
        }
        totalSim += bestSim;
        count++;
    }

    // For each item in B, find the best matching item in A (symmetric)
    for (const eb of embeddingsB) {
        let bestSim = 0;
        for (const ea of embeddingsA) {
            const sim = cosineSimilarity(ea.embedding, eb.embedding);
            if (sim > bestSim) bestSim = sim;
        }
        totalSim += bestSim;
        count++;
    }

    // Average of best matches in both directions
    return count > 0 ? totalSim / count : 0;
}

/**
 * Clears the embedding cache for a specific event, or the entire cache.
 * Call this after batch matching completes to free memory.
 */
export function clearEmbeddingCache(eventId?: string): void {
    if (eventId) {
        const prefix = `${eventId}:`;
        for (const key of embeddingCache.keys()) {
            if (key.startsWith(prefix)) embeddingCache.delete(key);
        }
        logger.debug(`Cleared embedding cache for event ${eventId}`);
    } else {
        embeddingCache.clear();
        logger.debug('Cleared entire embedding cache');
    }
}

/**
 * Returns whether semantic similarity is available (OpenAI key configured).
 */
export function isSemanticEnabled(): boolean {
    return Boolean(config.openai.apiKey);
}
