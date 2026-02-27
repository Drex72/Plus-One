import { logger } from '@/core';
import type { MatchableAttendee, MatchingConfig, ScoringResult } from '../interfaces';
import { checkHardConstraints, applySoftConstraintPenalties } from './constraints';
import { scoreAttribute, type ScoringContext } from './scorers';
import { calculatePreferenceBonus } from './preferences';

/**
 * Calculates the match score between two attendees using the event's matching config.
 *
 * Returns a score from 0–100 and a per-attribute breakdown.
 *
 * **Scoring flow:**
 * 1. Check event-level hard constraints → return 0 if any fail
 * 2. Calculate weighted attribute similarity scores (with semantic similarity when available)
 * 3. Normalize and scale to 0–100
 * 4. Apply graduated preference bonus (replaces old hard-constraint preferences)
 * 5. Apply soft constraint penalties
 * 6. Return final score (clamped 0–100)
 *
 * @param attendeeA - First attendee
 * @param attendeeB - Second attendee
 * @param config - The event's matching configuration
 * @param context - Optional scoring context (event ID for semantic embeddings)
 * @returns Scoring result with final score and per-attribute breakdown
 */
export function calculateMatchScore(
    attendeeA: MatchableAttendee,
    attendeeB: MatchableAttendee,
    config: MatchingConfig,
    context?: ScoringContext,
): ScoringResult {
    const emptyResult: ScoringResult = { score: 0, breakdown: {} };
    const constraints = config.constraints ?? [];

    // ── Step 1: Event-level hard constraints ────────────
    if (!checkHardConstraints(attendeeA, attendeeB, constraints)) {
        logger.debug(`Hard constraint failed: ${attendeeA.id} ↔ ${attendeeB.id}`);
        return emptyResult;
    }

    // ── Step 2: Calculate attribute similarity scores ───
    const attributes = config.attributes ?? [];
    if (attributes.length === 0) {
        return emptyResult;
    }

    const breakdown: Record<string, number> = {};
    let weightedSum = 0;
    let totalWeight = 0;

    for (const attribute of attributes) {
        // For array_similarity fields, prefer enriched profile values when available
        let aValue = attendeeA.profile[attribute.field];
        let bValue = attendeeB.profile[attribute.field];

        if (attribute.type === 'array_similarity') {
            if (attendeeA.enrichedProfile?.[attribute.field]?.length) {
                aValue = attendeeA.enrichedProfile[attribute.field];
            }
            if (attendeeB.enrichedProfile?.[attribute.field]?.length) {
                bValue = attendeeB.enrichedProfile[attribute.field];
            }
        }

        const similarity = scoreAttribute(aValue, bValue, attribute, context);
        breakdown[attribute.field] = parseFloat(similarity.toFixed(4));

        weightedSum += similarity * attribute.weight;
        totalWeight += attribute.weight;
    }

    // ── Step 3: Normalize and scale to 0–100 ───────────
    const normalizedScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
    let finalScore = Math.round(normalizedScore * 100);

    // ── Step 4: Apply graduated preference bonus ────────
    const { bonus, aToB, bToA, hasSynergy } = calculatePreferenceBonus(attendeeA, attendeeB);
    if (bonus > 0) {
        finalScore += bonus;
        breakdown['_preferenceBonus'] = bonus;
        breakdown['_prefA→B'] = aToB;
        breakdown['_prefB→A'] = bToA;
        if (hasSynergy) breakdown['_mutualSynergy'] = 1;
    }

    // ── Step 5: Apply soft constraint penalties ─────────
    finalScore = applySoftConstraintPenalties(finalScore, attendeeA, attendeeB, constraints);

    // ── Step 6: Clamp and return ────────────────────────
    finalScore = Math.max(0, Math.min(100, finalScore));

    return { score: finalScore, breakdown };
}
