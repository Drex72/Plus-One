import { cookies } from 'next/headers';
import type { Session, UserRole } from './types';

const COOKIE_NAME = 'plusone_session';

// Hardcoded admin key — in production this would be in env / a proper auth system
const ADMIN_API_KEY = process.env.ADMIN_API_KEY ?? '';

export async function getSession(): Promise<Session | null> {
    const store = await cookies();
    const raw = store.get(COOKIE_NAME)?.value;
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw) as Session;
        if (!parsed.apiKey || !parsed.tenant) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function resolveRole(apiKey: string): UserRole {
    if (ADMIN_API_KEY && apiKey === ADMIN_API_KEY) return 'admin';
    return 'tenant';
}

export { COOKIE_NAME };
