import { logger } from '@/core';
import type { AttributeConfig } from '../interfaces';
import { getSemanticSimilarity } from './embeddings';

/** Context passed to scorers that need external state (e.g., event ID for embeddings). */
export interface ScoringContext {
    eventId?: string;
}

/**
 * Returns 1 if both values are strictly equal, 0 otherwise.
 * Handles null/undefined gracefully.
 */
export function exactMatch(a: unknown, b: unknown): number {
    if (a === undefined || a === null || b === undefined || b === null) return 0;
    return a === b ? 1 : 0;
}

/**
 * Computes Jaccard similarity between two string arrays.
 * Jaccard = |intersection| / |union|
 *
 * Returns 0 for empty or invalid arrays.
 */
export function arraySimilarity(a: string[], b: string[]): number {
    if (!Array.isArray(a) || !Array.isArray(b)) return 0;
    if (a.length === 0 || b.length === 0) return 0;

    const setA = new Set(a.map((v) => String(v).toLowerCase()));
    const setB = new Set(b.map((v) => String(v).toLowerCase()));

    let intersectionSize = 0;
    for (const item of setA) {
        if (setB.has(item)) intersectionSize++;
    }

    const unionSize = setA.size + setB.size - intersectionSize;
    if (unionSize === 0) return 0;

    return intersectionSize / unionSize;
}

/**
 * Enhanced array similarity that attempts semantic similarity first,
 * then falls back to Jaccard if embeddings are unavailable.
 *
 * When semantic similarity is available:
 *   - Uses cosine similarity between pre-computed embeddings
 *   - "basketball" vs "sports" → ~0.85 (semantically related)
 *
 * When semantic similarity is unavailable:
 *   - Falls back to Jaccard (exact string matching)
 *   - "basketball" vs "sports" → 0 (different strings)
 */
export function enhancedArraySimilarity(a: string[], b: string[], eventId?: string): number {
    if (!Array.isArray(a) || !Array.isArray(b)) return 0;
    if (a.length === 0 || b.length === 0) return 0;

    // Try semantic similarity first (uses pre-computed embeddings)
    if (eventId) {
        const semanticScore = getSemanticSimilarity(a, b, eventId);
        if (semanticScore !== null) {
            // Blend: 70% semantic + 30% Jaccard to reward exact matches too
            const jaccardScore = arraySimilarity(a, b);
            return 0.7 * semanticScore + 0.3 * jaccardScore;
        }
    }

    // Fallback to pure Jaccard
    return arraySimilarity(a, b);
}

/**
 * Computes similarity based on ordinal position within a defined scale.
 * Formula: 1 - |indexA - indexB| / (scale.length - 1)
 *
 * Returns 0 if either value is not found in the scale.
 */
export function ordinalSimilarity(scale: string[], a: unknown, b: unknown): number {
    if (!Array.isArray(scale) || scale.length < 2) return 0;
    if (a === undefined || a === null || b === undefined || b === null) return 0;

    const normalizedScale = scale.map((s) => String(s).toLowerCase());
    const indexA = normalizedScale.indexOf(String(a).toLowerCase());
    const indexB = normalizedScale.indexOf(String(b).toLowerCase());

    if (indexA === -1 || indexB === -1) return 0;

    return 1 - Math.abs(indexA - indexB) / (scale.length - 1);
}

/**
 * Computes numeric proximity similarity.
 * Formula: max(0, 1 - |a - b| / maxDistance)
 *
 * Returns 0 for non-numeric values or when distance exceeds maxDistance.
 */
export function numericSimilarity(a: number, b: number, maxDistance: number): number {
    const numA = Number(a);
    const numB = Number(b);

    if (!Number.isFinite(numA) || !Number.isFinite(numB)) return 0;
    if (!Number.isFinite(maxDistance) || maxDistance <= 0) return 0;

    return Math.max(0, 1 - Math.abs(numA - numB) / maxDistance);
}

/** Default maxDistance for numeric attributes when not configured. */
const DEFAULT_MAX_DISTANCE = 10;

/**
 * Registry of attribute scorers. Extend this map to add custom scoring functions.
 * The 4th parameter 'context' provides event-scoped state (e.g., eventId for embeddings).
 */
export const scorerRegistry: Record<string, (aVal: unknown, bVal: unknown, config: AttributeConfig['config'], context?: ScoringContext) => number> = {
    exact: (a, b) => exactMatch(a, b),
    array_similarity: (a, b, _cfg, ctx) => enhancedArraySimilarity(a as string[], b as string[], ctx?.eventId),
    ordinal: (a, b, cfg) => ordinalSimilarity(cfg?.scale ?? [], a, b),
    numeric: (a, b, cfg) => numericSimilarity(a as number, b as number, cfg?.maxDistance ?? DEFAULT_MAX_DISTANCE),
};

/**
 * Dispatches scoring to the appropriate function based on the attribute type.
 * Falls back to exact match for unknown types.
 *
 * @param aValue - Value from attendee A's profile
 * @param bValue - Value from attendee B's profile
 * @param attribute - The attribute configuration
 * @param context - Optional scoring context (event ID for embeddings, etc.)
 * @returns Similarity score between 0 and 1
 */
export function scoreAttribute(aValue: unknown, bValue: unknown, attribute: AttributeConfig, context?: ScoringContext): number {
    const scorer = scorerRegistry[attribute.type];

    if (!scorer) {
        logger.warn(`Unknown attribute type "${attribute.type}" for field "${attribute.field}", falling back to exact match`);
        return exactMatch(aValue, bValue);
    }

    try {
        return scorer(aValue, bValue, attribute.config, context);
    } catch (error) {
        logger.warn(`Scoring error for field "${attribute.field}": ${error}`);
        return 0;
    }
}
