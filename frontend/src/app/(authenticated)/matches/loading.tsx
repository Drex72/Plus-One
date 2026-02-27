import { Skeleton } from '@/components/ui/skeleton';

export default function MatchesLoading() {
    return (
        <div className="px-6 py-8 space-y-6">
            <Skeleton className="h-8 w-36" />
            <div className="flex gap-3">
                <Skeleton className="h-9 w-48" />
                <Skeleton className="h-9 w-36" />
            </div>
            <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
            </div>
        </div>
    );
}
