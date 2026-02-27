import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getSession } from '@/lib/session';
import { Sidebar } from '@/components/layout/Sidebar';
import { SessionProvider } from '@/lib/hooks/useSession';

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }

    return (
        <SessionProvider initial={session}>
            <div className="flex min-h-screen">
                <Sidebar session={session} />
                <main className="flex-1 min-w-0">{children}</main>
            </div>
        </SessionProvider>
    );
}
