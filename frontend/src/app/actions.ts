'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentTenant } from '@/lib/api';
import { resolveRole, COOKIE_NAME } from '@/lib/session';
import type { Session } from '@/lib/types';

export async function loginAction(_prevState: { error: string } | null, formData: FormData): Promise<{ error: string } | null> {
    const apiKey = (formData.get('apiKey') as string)?.trim();

    if (!apiKey) {
        return { error: 'API key is required' };
    }

    try {
        const res = await getCurrentTenant(apiKey);
        const tenant = res.data;
        const role = resolveRole(apiKey);

        const session: Session = { apiKey, tenant, role };

        const store = await cookies();
        store.set(COOKIE_NAME, JSON.stringify(session), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 7 days
        });
    } catch (err: unknown) {
        return { error: 'Invalid API key. Please try again.' };
    }

    redirect('/dashboard');
}

export async function logoutAction() {
    const store = await cookies();
    store.delete(COOKIE_NAME);
    redirect('/login');
}
