/**
 * engine/enrichment.ts
 *
 * LLM-powered profile enrichment for improved semantic matching.
 *
 * Uses GPT-4o-mini to expand array field values with synonyms, hypernyms,
 * hyponyms, and related terms. E.g. "basketball" → ["basketball", "sports",
 * "team sports", "athletics", "ball sports"].
 *
 * Enrichment happens ONCE per attendee (at pool-entry time) and is stored
 * in the attendee's `metadata.enrichedAttributes` JSONB field.
 *
 * At match-time, enriched values are used for both Jaccard and embedding
 * comparisons — no additional LLM calls needed.
 */

import OpenAI from 'openai';
import { config } from '@/core/config';
import { logger } from '@/core';
import type { AttributeConfig, MatchingConfig } from '../interfaces';

// ─── Constants ──────────────────────────────────────────

const ENRICHMENT_MODEL = 'gpt-4o-mini';
const MAX_RETRIES = 2;
const ENRICHMENT_TIMEOUT_MS = 15_000;

// ─── Client ─────────────────────────────────────────────

function getOpenAIClient(): OpenAI | null {
    if (!config.openai.apiKey) return null;
    return new OpenAI({ apiKey: config.openai.apiKey });
}

// ─── Types ──────────────────────────────────────────────

export interface EnrichedProfile {
    /** Original field values mapped to their LLM-expanded arrays. */
    [field: string]: string[];
}

// ─── Core Enrichment ────────────────────────────────────

/**
 * Enriches a single attendee's profile using GPT-4o-mini.
 *
 * For each `array_similarity` field in the matching config, expands
 * the attendee's values with related terms (synonyms, hypernyms,
 * hyponyms, contextual associations).
 *
 * @returns Enriched profile keyed by field name, or null if enrichment
 *          is unavailable (no API key, no array fields, LLM error).
 */
export async function enrichProfile(
    profile: Record<string, unknown>,
    matchingConfig: MatchingConfig,
    eventContext?: { name?: string; description?: string },
): Promise<EnrichedProfile | null> {
    const openai = getOpenAIClient();
    if (!openai) {
        logger.debug('LLM enrichment skipped — no OpenAI API key configured');
        return null;
    }

    // Only enrich array_similarity fields (the ones that benefit from expansion)
    const arrayFields = (matchingConfig.attributes ?? []).filter((attr) => attr.type === 'array_similarity');

    if (arrayFields.length === 0) {
        logger.debug('No array_similarity fields to enrich');
        return null;
    }

    // Build the field→values mapping to send to the LLM
    const fieldsToEnrich: Record<string, string[]> = {};
    for (const attr of arrayFields) {
        const val = profile[attr.field];
        if (Array.isArray(val) && val.length > 0) {
            fieldsToEnrich[attr.field] = val.map((v) => String(v).trim()).filter(Boolean);
        } else if (typeof val === 'string' && val.trim()) {
            fieldsToEnrich[attr.field] = [val.trim()];
        }
    }

    if (Object.keys(fieldsToEnrich).length === 0) {
        logger.debug('No enrichable values found in profile');
        return null;
    }

    // Build the LLM prompt
    const eventDesc = eventContext?.name
        ? `This is for the event: "${eventContext.name}"${eventContext.description ? ` — ${eventContext.description}` : ''}.`
        : '';

    const prompt = buildEnrichmentPrompt(fieldsToEnrich, eventDesc);

    // Call the LLM with retries
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await openai.chat.completions.create({
                model: ENRICHMENT_MODEL,
                messages: [
                    {
                        role: 'system',
                        content:
                            'You are a semantic expansion engine. Given profile field values, ' +
                            'expand each value with related terms: synonyms, broader categories (hypernyms), ' +
                            'more specific terms (hyponyms), and contextually related concepts. ' +
                            'Fix typos. Keep expansions concise (3-6 related terms per original value). ' +
                            'Return ONLY valid JSON. No markdown, no explanation.',
                    },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.3,
                max_tokens: 1024,
                response_format: { type: 'json_object' },
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
                logger.warn(`LLM enrichment returned empty response (attempt ${attempt + 1})`);
                continue;
            }

            const parsed = JSON.parse(content) as Record<string, string[]>;

            // Validate structure: each key should map to an array of strings
            const enriched: EnrichedProfile = {};
            for (const [field, values] of Object.entries(parsed)) {
                if (Array.isArray(values)) {
                    enriched[field] = values
                        .filter((v): v is string => typeof v === 'string')
                        .map((v) => v.toLowerCase().trim())
                        .filter(Boolean);
                }
            }

            // Ensure we got results for the fields we asked about
            const enrichedFieldCount = Object.keys(enriched).length;
            if (enrichedFieldCount === 0) {
                logger.warn(`LLM enrichment returned no valid fields (attempt ${attempt + 1})`);
                continue;
            }

            logger.debug(
                `Enriched ${enrichedFieldCount} fields: ${Object.entries(enriched)
                    .map(([f, v]) => `${f}(${v.length})`)
                    .join(', ')}`,
            );

            return enriched;
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            logger.warn(`LLM enrichment attempt ${attempt + 1} failed: ${msg}`);

            if (attempt < MAX_RETRIES) {
                await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
            }
        }
    }

    logger.error('LLM enrichment failed after all retries — falling back to raw profile');
    return null;
}

/**
 * Batch-enriches multiple profiles in parallel.
 * Used as a lazy fallback at match-time for any un-enriched attendees.
 *
 * @returns Map of attendeeId → EnrichedProfile (null entries omitted)
 */
export async function batchEnrichProfiles(
    attendees: Array<{ id: string; profile: Record<string, unknown> }>,
    matchingConfig: MatchingConfig,
    eventContext?: { name?: string; description?: string },
    concurrency: number = 5,
): Promise<Map<string, EnrichedProfile>> {
    const results = new Map<string, EnrichedProfile>();

    // Process in batches to respect rate limits
    for (let i = 0; i < attendees.length; i += concurrency) {
        const batch = attendees.slice(i, i + concurrency);
        const promises = batch.map(async (att) => {
            try {
                const enriched = await enrichProfile(att.profile, matchingConfig, eventContext);
                if (enriched) {
                    results.set(att.id, enriched);
                }
            } catch (error) {
                logger.warn(`Failed to enrich attendee ${att.id}: ${error}`);
            }
        });

        await Promise.all(promises);
    }

    return results;
}

// ─── Helpers ────────────────────────────────────────────

function buildEnrichmentPrompt(fieldsToEnrich: Record<string, string[]>, eventContext: string): string {
    const fieldDescriptions = Object.entries(fieldsToEnrich)
        .map(([field, values]) => `  "${field}": ${JSON.stringify(values)}`)
        .join('\n');

    return `${eventContext}

Expand each value in the following profile fields with related terms.
For each field, return the ORIGINAL values PLUS 3-6 related terms per original value.
Related terms include: synonyms, broader categories, narrower specifics, and contextual associations.

Profile fields:
${fieldDescriptions}

Return a JSON object with the same field names, where each value is a flat array of strings (original values + expanded terms, all lowercase, deduplicated).

Example:
Input: {"skills": ["basketball", "cooking"]}
Output: {"skills": ["basketball", "sports", "team sports", "athletics", "ball sports", "nba", "cooking", "culinary", "food preparation", "cuisine", "baking", "gastronomy"]}`;
}

/**
 * Checks if LLM enrichment is available (API key configured).
 */
export function isEnrichmentEnabled(): boolean {
    return Boolean(config.openai.apiKey);
}
