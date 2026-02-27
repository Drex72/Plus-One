import { BadRequestError, logger } from '@/core';
import type { AttributeConfig, MatchingConfig } from '../interfaces';

/** Tolerance for weight sum validation (accounts for floating point imprecision). */
const WEIGHT_SUM_TOLERANCE = 0.05;

/**
 * Validates a matching configuration, ensuring it is well-formed and safe to use.
 * Throws a BadRequestError if the configuration is invalid.
 *
 * Checks:
 * - At least one attribute must be defined
 * - Weights should sum to approximately 1.0 (warns if not)
 * - Ordinal attributes must have a scale with at least 2 values
 * - Numeric attributes should have maxDistance defined (defaults to 10)
 */
export function validateMatchingConfig(config: MatchingConfig): void {
    if (!config) {
        throw new BadRequestError('Matching config is required');
    }

    if (!config.attributes || config.attributes.length === 0) {
        throw new BadRequestError(
            'Matching config must have at least one attribute. ' +
                'Define attributes to specify how attendees should be compared (e.g., interests, skills, experience).',
        );
    }

    // Validate each attribute
    for (const attribute of config.attributes) {
        validateAttribute(attribute);
    }

    // Check weight sum
    const totalWeight = config.attributes.reduce((sum, attr) => sum + attr.weight, 0);
    if (Math.abs(totalWeight - 1.0) > WEIGHT_SUM_TOLERANCE) {
        logger.warn(
            `Attribute weights sum to ${totalWeight.toFixed(3)} instead of 1.0. ` +
                `Scores will be normalized, but consider adjusting weights for clarity.`,
        );
    }

    // Validate constraints reference valid fields
    if (config.constraints?.length) {
        const requiredFields = new Set(config.requiredFields ?? []);
        for (const constraint of config.constraints) {
            if (requiredFields.size > 0 && !requiredFields.has(constraint.field)) {
                logger.warn(
                    `Constraint references field "${constraint.field}" which is not in requiredFields. ` +
                        `The constraint may not work if attendees don't have this field.`,
                );
            }
        }
    }
}

/**
 * Validates a single attribute configuration.
 */
function validateAttribute(attribute: AttributeConfig): void {
    if (!attribute.field) {
        throw new BadRequestError('Each attribute must have a "field" name');
    }

    if (attribute.weight < 0 || attribute.weight > 1) {
        throw new BadRequestError(`Attribute "${attribute.field}" weight must be between 0 and 1, got ${attribute.weight}`);
    }

    switch (attribute.type) {
        case 'ordinal':
            if (!attribute.config?.scale || attribute.config.scale.length < 2) {
                throw new BadRequestError(
                    `Ordinal attribute "${attribute.field}" requires a "scale" array with at least 2 values ` +
                        `(e.g., ["junior", "mid", "senior"]).`,
                );
            }
            break;

        case 'numeric':
            if (attribute.config?.maxDistance === undefined) {
                logger.warn(
                    `Numeric attribute "${attribute.field}" has no maxDistance configured. Defaulting to 10. ` +
                        `Set config.maxDistance for more accurate scoring.`,
                );
            }
            break;

        case 'exact':
        case 'array_similarity':
            break;

        default:
            logger.warn(`Unknown attribute type "${attribute.type}" for field "${attribute.field}". Falling back to exact match.`);
    }
}

/**
 * Generates default attribute configurations from a list of required field names.
 * Uses heuristics to infer the most appropriate matching type:
 *
 * - Fields ending in 's' or containing 'interest'/'skill' → array_similarity
 * - Fields containing 'age'/'salary'/'income' → numeric
 * - Fields containing 'level'/'stage'/'experience' → ordinal
 * - Default → exact
 *
 * Assigns equal weights across all attributes (1.0 / count).
 *
 * @param requiredFields - List of profile field names
 * @returns Generated attribute configurations
 */
export function generateDefaultAttributes(requiredFields: string[]): AttributeConfig[] {
    if (!requiredFields || requiredFields.length === 0) return [];

    const equalWeight = 1.0 / requiredFields.length;

    return requiredFields.map((field): AttributeConfig => {
        const normalized = field.toLowerCase();

        if (normalized.includes('interest') || normalized.includes('skill') || normalized.includes('goal') || normalized.includes('hobby')) {
            return { field, type: 'array_similarity', weight: equalWeight, config: {} };
        }

        if (normalized.endsWith('s') && !normalized.endsWith('ss') && !normalized.endsWith('us')) {
            return { field, type: 'array_similarity', weight: equalWeight, config: {} };
        }

        if (
            normalized.includes('age') ||
            normalized.includes('salary') ||
            normalized.includes('income') ||
            normalized.includes('distance') ||
            normalized.includes('budget')
        ) {
            return { field, type: 'numeric', weight: equalWeight, config: { maxDistance: 10 } };
        }

        if (normalized.includes('level') || normalized.includes('stage') || normalized.includes('experience') || normalized.includes('seniority')) {
            return {
                field,
                type: 'ordinal',
                weight: equalWeight,
                config: { scale: ['junior', 'mid', 'senior', 'lead', 'executive'] },
            };
        }

        return { field, type: 'exact', weight: equalWeight, config: {} };
    });
}
