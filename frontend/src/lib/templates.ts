/**
 * Event templates — persisted in localStorage.
 */

export interface EventTemplate {
    id: string;
    name: string;
    createdAt: string;
    matchThreshold: number;
    requiredFields: string[];
    attributes: Array<{
        field: string;
        type: string;
        weight: number;
        config?: Record<string, unknown>;
    }>;
    constraints: Array<{
        field: string;
        operator: string;
        value: unknown;
        type: string;
    }>;
}

const STORAGE_KEY = 'plusone_event_templates';

export function getTemplates(): EventTemplate[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function saveTemplate(template: Omit<EventTemplate, 'id' | 'createdAt'>): EventTemplate {
    const full: EventTemplate = {
        ...template,
        id: Math.random().toString(36).slice(2, 9),
        createdAt: new Date().toISOString(),
    };
    const existing = getTemplates();
    existing.unshift(full);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(0, 20)));
    return full;
}

export function deleteTemplate(id: string): void {
    const existing = getTemplates().filter((t) => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}
