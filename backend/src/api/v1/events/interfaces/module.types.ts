import { DatabaseTable } from '@/core/types';

export type DatabaseEvent = DatabaseTable['events']['Row'];

export interface ConstraintRule {
    field: string;
    operator: 'eq' | 'neq' | 'in' | 'not_in' | 'range' | 'gte' | 'lte';
    value: unknown;
    type: 'hard' | 'soft';
}

type AttributeType = 'array_similarity' | 'ordinal' | 'exact' | 'numeric';

export interface AttributeConfig {
    field: string;
    type: AttributeType;
    weight: number;
    config: Partial<{
        scale: string[];
        maxDistance: number;
    }>;
}

export interface MatchingConfig {
    matchThreshold: number;
    requiredFields: string[];
    constraints: ConstraintRule[];
    attributes: AttributeConfig[];
}

export type Event = {
    id: string;
    tenantId: string;
    name: string;
    description: string | null;
    matchingConfig: Partial<MatchingConfig>;
    status: 'draft' | 'active' | 'matching' | 'completed' | 'archived';
    startsAt: string | null;
    endsAt: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
};
