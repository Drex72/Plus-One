'use client';

import { useQuery } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/lib/hooks/useSession';
import { listJobs } from '@/lib/api';
import { Clock, CheckCircle2, XCircle, Loader2, Timer, Zap } from 'lucide-react';
import type { MatchingJob, JobStatus } from '@/lib/types';

interface Props {
    eventId: string;
    open: boolean;
    onClose: () => void;
}

const STATUS_META: Record<JobStatus, { label: string; color: string; icon: React.ElementType }> = {
    queued: {
        label: 'Queued',
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        icon: Clock,
    },
    processing: {
        label: 'Processing',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        icon: Loader2,
    },
    completed: {
        label: 'Completed',
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        icon: CheckCircle2,
    },
    failed: {
        label: 'Failed',
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        icon: XCircle,
    },
};

export function JobHistoryDrawer({ eventId, open, onClose }: Props) {
    const { apiKey } = useSession();

    const { data, isLoading } = useQuery({
        queryKey: ['jobs', eventId],
        queryFn: async () => {
            const res = await listJobs(apiKey, eventId, { pageSize: 50 });
            return res.data;
        },
        enabled: open && Boolean(eventId && apiKey),
    });

    const jobs: MatchingJob[] = data ?? [];

    return (
        <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
            <SheetContent className="sm:max-w-md w-full overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Job History</SheetTitle>
                    <SheetDescription>Matching jobs for this event, newest first.</SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-3">
                    {isLoading ? (
                        Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)
                    ) : jobs.length === 0 ? (
                        <div className="text-center py-12">
                            <Zap className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No matching jobs found for this event yet.</p>
                        </div>
                    ) : (
                        jobs.map((job) => <JobCard key={job.id} job={job} />)
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}

function JobCard({ job }: { job: MatchingJob }) {
    const meta = STATUS_META[job.status] ?? STATUS_META.queued;
    const Icon = meta.icon;

    const duration =
        job.startedAt && job.completedAt ? Math.round((new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()) / 1000) : null;

    const summary = job.resultSummary;

    return (
        <div className="border rounded-lg p-3 space-y-2">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Badge variant="secondary" className={`gap-1 text-xs font-medium ${meta.color}`}>
                    <Icon className={`h-3 w-3 ${job.status === 'processing' ? 'animate-spin' : ''}`} />
                    {meta.label}
                </Badge>
                <span className="text-xs text-muted-foreground">{new Date(job.createdAt).toLocaleString()}</span>
            </div>

            {/* Mode */}
            <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Mode:</span>
                <span className="font-medium capitalize">{job.mode.replace(/_/g, ' ')}</span>
            </div>

            {/* Duration */}
            {duration != null && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Timer className="h-3 w-3" />
                    {duration}s
                </div>
            )}

            {/* Result summary */}
            {summary && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    {summary.matchesFound != null && (
                        <span>
                            <span className="text-muted-foreground">Matches:</span> <span className="font-medium">{summary.matchesFound}</span>
                        </span>
                    )}
                    {summary.totalAttendees != null && (
                        <span>
                            <span className="text-muted-foreground">Processed:</span> <span className="font-medium">{summary.totalAttendees}</span>
                        </span>
                    )}
                    {summary.elapsedMs != null && (
                        <span>
                            <span className="text-muted-foreground">Time:</span>{' '}
                            <span className="font-medium">{(summary.elapsedMs / 1000).toFixed(1)}s</span>
                        </span>
                    )}
                </div>
            )}

            {/* Error */}
            {job.error && <p className="text-xs text-destructive bg-destructive/10 rounded p-2">{job.error}</p>}
        </div>
    );
}
