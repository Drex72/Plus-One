// ─── Engine barrel ──────────────────────────────────────
export { calculateMatchScore } from './matcher';
export {
    scoreAttribute,
    exactMatch,
    arraySimilarity,
    enhancedArraySimilarity,
    ordinalSimilarity,
    numericSimilarity,
    scorerRegistry,
} from './scorers';
export type { ScoringContext } from './scorers';
export {
    satisfiesConstraint,
    checkHardConstraints,
    checkPreferenceConstraints,
    applySoftConstraintPenalties,
    preferencesToConstraints,
} from './constraints';
export { calculatePreferenceBonus, calculatePreferenceSatisfaction } from './preferences';
export { precomputeEmbeddings, getSemanticSimilarity, cosineSimilarity, clearEmbeddingCache, isSemanticEnabled } from './embeddings';
export { enrichProfile, batchEnrichProfiles, isEnrichmentEnabled } from './enrichment';
export type { EnrichedProfile } from './enrichment';
export { validateMatchingConfig, generateDefaultAttributes } from './validators';
export { toMatchableAttendee, normalizePreferences, normalizeProfile, pairKey, chunk, shuffleArray } from './utils';
