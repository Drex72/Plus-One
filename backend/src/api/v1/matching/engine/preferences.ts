import { logger } from '@/core';
import type { AttendeePreference, MatchableAttendee } from '../interfaces';

// ─── Scoring Constants ──────────────────────────────────

/** Maximum bonus for a single fully-satisfied preference. */
const MAX_PREFERENCE_BONUS = 12;

/** Minimum bonus for a partially-satisfied preference. */
const MIN_PARTIAL_BONUS = 3;

/** Extra bonus when BOTH attendees' preferences are mutually satisfied. */
const MUTUAL_SYNERGY_BONUS = 10;

/** Threshold above which a preference is considered "satisfied" for synergy calculation. */
const SYNERGY_SATISFACTION_THRESHOLD = 0.5;

// ─── Core Functions ─────────────────────────────────────

/**
 * Calculates how well a candidate satisfies a single preference.
 *
 * Returns a satisfaction ratio between 0 (no match) and 1 (fully satisfied).
 *
 * For `in` preferences (e.g., preferred interests: ["ai", "web3"]):
 *   - Counts how many preferred values appear in the candidate's field
 *   - Returns matchCount / totalPreferred
 *
 * For `range` preferences (e.g., preferred age: [25, 35]):
 *   - Returns 1 if the candidate's value is within range
 *   - Returns a decay between 0–1 based on distance from range
 */
export function calculatePreferenceSatisfaction(preference: AttendeePreference, candidateProfile: Record<string, unknown>): number {
    const candidateValue = candidateProfile[preference.field];

    if (candidateValue === undefined || candidateValue === null) return 0;

    switch (preference.type) {
        case 'in': {
            const preferredValues = preference.value;
            if (!Array.isArray(preferredValues) || preferredValues.length === 0) return 0;

            // Normalize for case-insensitive comparison
            const normalizedPreferred = new Set(preferredValues.map((v) => String(v).toLowerCase().trim()));

            // If candidate value is an array (e.g., interests: ["ai", "blockchain"])
            if (Array.isArray(candidateValue)) {
                const normalizedCandidate = candidateValue.map((v) => String(v).toLowerCase().trim());
                let matchCount = 0;
                for (const item of normalizedCandidate) {
                    if (normalizedPreferred.has(item)) matchCount++;
                }
                return Math.min(1, matchCount / normalizedPreferred.size);
            }

            // Single value (e.g., experienceLevel: "senior")
            const normalizedSingle = String(candidateValue).toLowerCase().trim();
            return normalizedPreferred.has(normalizedSingle) ? 1 : 0;
        }

        case 'range': {
            if (!Array.isArray(preference.value) || preference.value.length < 2) return 0;

            const numValue = Number(candidateValue);
            if (!Number.isFinite(numValue)) return 0;

            const [min, max] = [Number(preference.value[0]), Number(preference.value[1])];
            if (!Number.isFinite(min) || !Number.isFinite(max)) return 0;

            // Within range → full satisfaction
            if (numValue >= min && numValue <= max) return 1;

            // Outside range → decay based on distance
            const rangeSpan = max - min || 1;
            const distance = numValue < min ? min - numValue : numValue - max;
            const decay = Math.max(0, 1 - distance / rangeSpan);
            return decay;
        }

        default:
            return 0;
    }
}

/**
 * Calculates the total preference bonus for a pair of attendees.
 *
 * This replaces the old hard-constraint approach. Instead of rejecting
 * pairs that don't perfectly match preferences, we award bonus points
 * for how well preferences are satisfied:
 *
 * 1. For each of A's preferences, calculate satisfaction ratio against B
 * 2. For each of B's preferences, calculate satisfaction ratio against A
 * 3. Convert satisfaction ratios to bonus points (graduated)
 * 4. If both sides are mutually satisfied, add a synergy bonus
 *
 * @returns An object with:
 *   - `bonus`: Total bonus points to add to the base score (0 to ~40)
 *   - `aToB`: How well B satisfies A's preferences (0–1)
 *   - `bToA`: How well A satisfies B's preferences (0–1)
 *   - `hasSynergy`: Whether mutual synergy bonus was applied
 */
export function calculatePreferenceBonus(
    attendeeA: MatchableAttendee,
    attendeeB: MatchableAttendee,
): {
    bonus: number;
    aToB: number;
    bToA: number;
    hasSynergy: boolean;
} {
    const prefsA = attendeeA.preferences ?? [];
    const prefsB = attendeeB.preferences ?? [];

    // If neither attendee has preferences, no bonus/penalty
    if (prefsA.length === 0 && prefsB.length === 0) {
        return { bonus: 0, aToB: 0, bToA: 0, hasSynergy: false };
    }

    // Calculate how well B satisfies A's preferences
    let aToBTotal = 0;
    for (const pref of prefsA) {
        const satisfaction = calculatePreferenceSatisfaction(pref, attendeeB.profile);
        aToBTotal += satisfaction;
    }
    const aToBAvg = prefsA.length > 0 ? aToBTotal / prefsA.length : 0;

    // Calculate how well A satisfies B's preferences
    let bToATotal = 0;
    for (const pref of prefsB) {
        const satisfaction = calculatePreferenceSatisfaction(pref, attendeeA.profile);
        bToATotal += satisfaction;
    }
    const bToAAvg = prefsB.length > 0 ? bToATotal / prefsB.length : 0;

    // Convert satisfaction ratios to bonus points
    let bonus = 0;

    // A's preferences bonus (how well B matches what A wants)
    if (prefsA.length > 0) {
        bonus += aToBAvg * MAX_PREFERENCE_BONUS;
        // Partial credit: even a small overlap gets minimum bonus
        if (aToBAvg > 0 && aToBAvg < 0.5) {
            bonus = Math.max(bonus, MIN_PARTIAL_BONUS);
        }
    }

    // B's preferences bonus (how well A matches what B wants)
    if (prefsB.length > 0) {
        bonus += bToAAvg * MAX_PREFERENCE_BONUS;
        if (bToAAvg > 0 && bToAAvg < 0.5) {
            bonus = Math.max(bonus, MIN_PARTIAL_BONUS);
        }
    }

    // Mutual synergy: both sides are happy → extra bonus
    const hasSynergy =
        prefsA.length > 0 && prefsB.length > 0 && aToBAvg >= SYNERGY_SATISFACTION_THRESHOLD && bToAAvg >= SYNERGY_SATISFACTION_THRESHOLD;

    if (hasSynergy) {
        bonus += MUTUAL_SYNERGY_BONUS;
        logger.debug(`Mutual synergy bonus applied: ${attendeeA.id} ↔ ${attendeeB.id}`);
    }

    return {
        bonus: Math.round(bonus * 100) / 100,
        aToB: Math.round(aToBAvg * 1000) / 1000,
        bToA: Math.round(bToAAvg * 1000) / 1000,
        hasSynergy,
    };
}
