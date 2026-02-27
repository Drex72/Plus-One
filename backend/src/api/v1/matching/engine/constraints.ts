import { logger } from '@/core';
import type { AttendeePreference, ConstraintRule, MatchableAttendee } from '../interfaces';

/** Default penalty (out of 100) subtracted per failed soft constraint. */
const DEFAULT_SOFT_PENALTY = 10;

/**
 * Checks whether a value is a field reference (e.g., `{ field: "someField" }`).
 * Field references pull comparison values from the other attendee's profile.
 */
function isFieldReference(value: unknown): value is { field: string } {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        'field' in value &&
        typeof (value as Record<string, unknown>).field === 'string'
    );
}

/**
 * Resolves the comparison value for a constraint.
 * If the value is a field reference, extracts the value from the attendee's profile.
 * Otherwise returns the literal value.
 */
function resolveComparisonValue(value: unknown, attendee: MatchableAttendee): unknown {
    if (isFieldReference(value)) {
        return attendee.profile[value.field];
    }
    return value;
}

/**
 * Evaluates whether a candidate satisfies a single constraint from the attendee's perspective.
 *
 * - `field` refers to a field on the **candidate**'s profile
 * - `value` is either a literal or a `{ field: "x" }` reference to the **attendee**'s profile
 *
 * @param attendee - The attendee whose perspective we're checking from
 * @param candidate - The candidate being evaluated
 * @param constraint - The constraint rule to evaluate
 * @returns true if the constraint is satisfied
 */
export function satisfiesConstraint(attendee: MatchableAttendee, candidate: MatchableAttendee, constraint: ConstraintRule): boolean {
    const candidateValue = candidate.profile[constraint.field];
    const comparisonValue = resolveComparisonValue(constraint.value, attendee);

    if (candidateValue === undefined || candidateValue === null) {
        // Missing field on candidate — constraint cannot be satisfied
        return false;
    }

    try {
        switch (constraint.operator) {
            case 'eq':
                return candidateValue === comparisonValue;

            case 'neq':
                return candidateValue !== comparisonValue;

            case 'in': {
                if (!Array.isArray(comparisonValue)) return false;
                return comparisonValue.includes(candidateValue);
            }

            case 'not_in': {
                if (!Array.isArray(comparisonValue)) return false;
                return !comparisonValue.includes(candidateValue);
            }

            case 'range': {
                if (!Array.isArray(comparisonValue) || comparisonValue.length < 2) return false;
                const numValue = Number(candidateValue);
                if (!Number.isFinite(numValue)) return false;
                return numValue >= Number(comparisonValue[0]) && numValue <= Number(comparisonValue[1]);
            }

            case 'gte': {
                return Number(candidateValue) >= Number(comparisonValue);
            }

            case 'lte': {
                return Number(candidateValue) <= Number(comparisonValue);
            }

            default:
                logger.warn(`Unknown constraint operator: "${(constraint as ConstraintRule).operator}"`);
                return true;
        }
    } catch (error) {
        logger.warn(`Constraint evaluation error for field "${constraint.field}": ${error}`);
        return false;
    }
}

/**
 * Checks all hard constraints between two attendees.
 * Returns false if ANY hard constraint fails.
 *
 * Checks are bidirectional: both (attendee→candidate) and (candidate→attendee)
 * must pass for literal-value constraints (e.g., age range applies to both).
 */
export function checkHardConstraints(attendee: MatchableAttendee, candidate: MatchableAttendee, constraints: ConstraintRule[]): boolean {
    const hardConstraints = constraints.filter((c) => c.type === 'hard');

    for (const constraint of hardConstraints) {
        if (!satisfiesConstraint(attendee, candidate, constraint)) {
            return false;
        }
        if (!satisfiesConstraint(candidate, attendee, constraint)) {
            return false;
        }
    }

    return true;
}

/**
 * Converts an attendee's personal preferences into constraint rules.
 * Preferences are treated as hard constraints on the candidate.
 *
 * @param preferences - The attendee's preference list
 * @returns Equivalent hard constraint rules
 */
export function preferencesToConstraints(preferences: AttendeePreference[]): ConstraintRule[] {
    if (!Array.isArray(preferences)) return [];

    return preferences
        .filter((p) => p && p.field && p.value !== undefined)
        .map((pref): ConstraintRule => {
            switch (pref.type) {
                case 'in':
                    return { field: pref.field, operator: 'in', value: pref.value, type: 'hard' };
                case 'range':
                    return { field: pref.field, operator: 'range', value: pref.value, type: 'hard' };
                default:
                    return { field: pref.field, operator: 'in', value: pref.value, type: 'hard' };
            }
        });
}

/**
 * Checks attendee preference constraints.
 * Both attendees' preferences must be satisfied (bidirectional).
 *
 * @returns true if both attendees' preferences are compatible
 */
export function checkPreferenceConstraints(attendee: MatchableAttendee, candidate: MatchableAttendee): boolean {
    // Attendee's preferences → candidate must satisfy them
    const attendeeConstraints = preferencesToConstraints(attendee.preferences);
    for (const constraint of attendeeConstraints) {
        if (!satisfiesConstraint(attendee, candidate, constraint)) {
            return false;
        }
    }

    // Candidate's preferences → attendee must satisfy them (bidirectional)
    const candidateConstraints = preferencesToConstraints(candidate.preferences);
    for (const constraint of candidateConstraints) {
        if (!satisfiesConstraint(candidate, attendee, constraint)) {
            return false;
        }
    }

    return true;
}

/**
 * Applies score penalties for each failed soft constraint.
 * Penalties are applied once per constraint (not double-counted for bidirectional checks).
 * The score is clamped to a minimum of 0.
 *
 * @param baseScore - The score before penalties (0–100)
 * @param attendee - The first attendee
 * @param candidate - The second attendee
 * @param constraints - All constraint rules (only soft constraints are processed)
 * @returns Adjusted score after penalties, minimum 0
 */
export function applySoftConstraintPenalties(
    baseScore: number,
    attendee: MatchableAttendee,
    candidate: MatchableAttendee,
    constraints: ConstraintRule[],
): number {
    const softConstraints = constraints.filter((c) => c.type === 'soft');
    let adjustedScore = baseScore;

    for (const constraint of softConstraints) {
        const failsAB = !satisfiesConstraint(attendee, candidate, constraint);
        const failsBA = !satisfiesConstraint(candidate, attendee, constraint);

        if (failsAB || failsBA) {
            adjustedScore -= DEFAULT_SOFT_PENALTY;
        }
    }

    return Math.max(0, adjustedScore);
}
