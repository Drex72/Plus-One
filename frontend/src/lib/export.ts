/**
 * CSV export utilities for attendees and matches.
 */

function escapeCsvValue(value: unknown): string {
    if (value == null) return '';
    const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

export function exportToCsv(filename: string, headers: string[], rows: string[][]) {
    const csvContent = [headers.map(escapeCsvValue).join(','), ...rows.map((row) => row.map(escapeCsvValue).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
}

import type { Attendee, Match } from './types';

export function exportAttendees(attendees: Attendee[], eventName?: string) {
    const attrKeys = new Set<string>();
    for (const att of attendees) {
        if (att.attributes) {
            for (const k of Object.keys(att.attributes)) attrKeys.add(k);
        }
    }
    const dynamicCols = Array.from(attrKeys);

    const headers = ['Name', 'Email', 'Status', 'External ID', ...dynamicCols, 'Registered At'];
    const rows = attendees.map((att) => [
        att.name,
        att.email ?? '',
        att.status,
        att.externalId ?? '',
        ...dynamicCols.map((k) => {
            const v = att.attributes?.[k];
            if (v == null) return '';
            if (Array.isArray(v)) return v.join('; ');
            return String(v);
        }),
        new Date(att.createdAt).toLocaleString(),
    ]);

    const safeName = (eventName ?? 'attendees').replace(/[^a-zA-Z0-9]/g, '_');
    exportToCsv(`${safeName}_attendees_${Date.now()}.csv`, headers, rows);
}

export function exportMatches(matches: Match[], nameLookup: Map<string, string>, eventName?: string) {
    const headers = ['Attendee A', 'Attendee B', 'Score', 'Status', 'Strategy', 'Created At'];
    const rows = matches.map((m) => [
        nameLookup.get(m.attendeeAId) ?? m.attendeeAId,
        nameLookup.get(m.attendeeBId) ?? m.attendeeBId,
        String(Math.round(m.score)),
        m.status,
        m.strategy,
        new Date(m.createdAt).toLocaleString(),
    ]);

    const safeName = (eventName ?? 'matches').replace(/[^a-zA-Z0-9]/g, '_');
    exportToCsv(`${safeName}_matches_${Date.now()}.csv`, headers, rows);
}

export function parseCsvToAttendees(csvText: string): Array<{ name: string; email?: string; profile: Record<string, unknown> }> {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase());
    const nameIdx = headers.findIndex((h) => h === 'name');
    const emailIdx = headers.findIndex((h) => h === 'email');

    if (nameIdx === -1) throw new Error("CSV must have a 'name' column");

    const skipCols = new Set(['name', 'email', 'status', 'external id', 'externalid', 'registered at', 'id']);

    return lines
        .slice(1)
        .filter(Boolean)
        .map((line) => {
            const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
            const name = values[nameIdx] || 'Unknown';
            const email = emailIdx >= 0 ? values[emailIdx] || undefined : undefined;
            const profile: Record<string, unknown> = {};

            for (let i = 0; i < headers.length; i++) {
                if (!skipCols.has(headers[i]) && values[i]) {
                    // Try to parse arrays (semicolon-separated)
                    if (values[i].includes(';')) {
                        profile[headers[i]] = values[i].split(';').map((s) => s.trim());
                    } else {
                        profile[headers[i]] = values[i];
                    }
                }
            }

            return { name, email, profile };
        });
}
