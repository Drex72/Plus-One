'use client';

import { Button } from '@/components/ui/button';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold">Something went wrong</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">{error.message || 'Failed to load dashboard data.'}</p>
            <Button onClick={reset} variant="outline" size="sm" className="mt-4 gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" />
                Try Again
            </Button>
        </div>
    );
}
