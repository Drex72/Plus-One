import type { ReactNode } from 'react';

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
    return (
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
                {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
            </div>
            {actions && <div className="flex items-center gap-2 mt-3 sm:mt-0">{actions}</div>}
        </div>
    );
}
