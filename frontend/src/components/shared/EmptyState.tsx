import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
                {icon ?? <Inbox className="h-6 w-6 text-muted-foreground" />}
            </div>
            <h3 className="text-base font-semibold">{title}</h3>
            {description && <p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
