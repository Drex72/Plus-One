import { Card, CardContent } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

export function StatsCard({ title, value, subtitle, icon: Icon }: { title: string; value: string | number; subtitle?: string; icon: LucideIcon }) {
    return (
        <Card>
            <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">{title}</p>
                    <p className="text-2xl font-semibold tracking-tight">{value}</p>
                    {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
                </div>
            </CardContent>
        </Card>
    );
}
