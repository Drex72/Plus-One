import type { ReactNode } from 'react';
import type { Session } from '@/lib/types';
import { MobileSidebar } from './MobileSidebar';

export function Header({ title, session, actions }: { title: string; session: Session; actions?: ReactNode }) {
    return (
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-white/80 backdrop-blur-sm px-6 py-4">
            <div className="flex items-center gap-3">
                <MobileSidebar session={session} />
                <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
    );
}
