import { Skeleton } from '@/components/ui/skeleton';

export default function EventsLoading() {
    return (
        <div className="px-6 py-8 space-y-6">
            <div className="flex justify-between items-center">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-9 w-32" />
            </div>
            <div className="flex gap-3">
                <Skeleton className="h-9 w-64" />
                <Skeleton className="h-9 w-36" />
            </div>
            <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
            </div>
        </div>
    );
}
