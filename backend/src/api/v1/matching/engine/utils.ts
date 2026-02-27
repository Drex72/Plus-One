import type { Json } from '@/core/types/common/database.interface';
import type { AttendeePreference, MatchableAttendee } from '../interfaces';

/**
 * Normalizes a raw JSON preferences value into a typed array.
 * Handles the following cases:
 * - Already an array → filter for valid preference objects
 * - Single preference object → wrap in array
 * - null/undefined/empty → return empty array
 */
export function normalizePreferences(raw: unknown): AttendeePreference[] {
    if (!raw) return [];

    if (Array.isArray(raw)) {
        return raw.filter(isValidPreference);
    }

    if (isValidPreference(raw)) {
        return [raw as AttendeePreference];
    }

    return [];
}

/**
 * Normalizes a raw JSON attributes/profile value into a typed record.
 */
export function normalizeProfile(raw: unknown): Record<string, unknown> {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return raw as Record<string, unknown>;
}

/**
 * Converts a raw database attendee row into a MatchableAttendee.
 * Maps `attributes` → `profile` and normalizes preferences.
 * Extracts enrichedAttributes from the `metadata` JSONB column.
 */
export function toMatchableAttendee(row: Record<string, unknown>): MatchableAttendee {
    // Extract enriched profile from metadata.enrichedAttributes
    let enrichedProfile: Record<string, string[]> | null = null;
    const metadata = row.metadata as Record<string, unknown> | null;
    if (metadata && typeof metadata === 'object' && metadata.enrichedAttributes) {
        const ea = metadata.enrichedAttributes as Record<string, unknown>;
        if (typeof ea === 'object' && !Array.isArray(ea)) {
            enrichedProfile = {} as Record<string, string[]>;
            for (const [key, val] of Object.entries(ea)) {
                if (Array.isArray(val)) {
                    enrichedProfile[key] = val.filter((v): v is string => typeof v === 'string');
                }
            }
            // If no valid fields were extracted, set to null
            if (Object.keys(enrichedProfile).length === 0) enrichedProfile = null;
        }
    }

    return {
        id: row.id as string,
        eventId: row.event_id as string,
        tenantId: row.tenant_id as string,
        name: row.name as string,
        profile: normalizeProfile(row.attributes),
        enrichedProfile,
        preferences: normalizePreferences(row.preferences),
        status: row.status as string,
    };
}

/**
 * Type guard: checks if a value looks like a valid AttendeePreference.
 */
function isValidPreference(value: unknown): value is AttendeePreference {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const obj = value as Record<string, unknown>;
    return typeof obj.field === 'string' && Array.isArray(obj.value) && typeof obj.type === 'string';
}

/**
 * Generates a canonical pair key to prevent duplicate pair processing.
 * Always puts the lexicographically smaller ID first.
 */
export function pairKey(idA: string, idB: string): string {
    return idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`;
}

/**
 * Chunks an array into smaller arrays of the specified size.
 * Used for batch database inserts.
 */
export function chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

/**
 * Fisher-Yates in-place shuffle to randomize array order.
 * Used to eliminate registration-order bias when capping candidate pools.
 */
export function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
