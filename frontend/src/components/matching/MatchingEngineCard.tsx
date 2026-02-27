'use client';

import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { JobStatusBadge } from '@/components/shared/StatusBadges';
import { useMatchingJobStatus } from '@/lib/hooks/useMatchingStatus';
import { useSession } from '@/lib/hooks/useSession';
import { stopMatching } from '@/lib/api';
import { Play, RotateCcw, Loader2, AlertCircle, CheckCircle2, Sparkles, Square } from 'lucide-react';
import { toast } from 'sonner';
import type { MatchingJob, EventStatus } from '@/lib/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1';

interface MatchingEngineCardProps {
    eventId: string;
    eventStatus: EventStatus;
    onMatchingComplete?: () => void;
}

export function MatchingEngineCard({ eventId, eventStatus, onMatchingComplete }: MatchingEngineCardProps) {
    const { apiKey } = useSession();
    const queryClient = useQueryClient();
    const [activeJobId, setActiveJobId] = useState<string | null>(null);
    const [lastJob, setLastJob] = useState<MatchingJob | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const completedJobRef = useRef<string | null>(null);

    const { data: job } = useMatchingJobStatus(apiKey, eventId, activeJobId);

    const currentJob = job ?? lastJob;

    const triggerMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`${BASE_URL}/matching/${eventId}/match`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey,
                },
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.message ?? `Failed: ${res.status}`);
            }
            return res.json();
        },
        onSuccess: (data) => {
            const jobId = data.data?.matchingJobId;
            if (jobId) {
                setActiveJobId(jobId);
                setShowSuccess(false);
                toast.success('Matching started', {
                    description: `Job ${jobId.slice(0, 8)}… is queued.`,
                });
                // Refresh parent so event status updates to 'matching'
                onMatchingComplete?.();
            }
        },
        onError: (err: Error) => {
            toast.error('Failed to start matching', { description: err.message });
        },
    });

    // When job completes, fire callback and invalidate related queries
    useEffect(() => {
        if (job && job.status === 'completed' && completedJobRef.current !== job.id) {
            completedJobRef.current = job.id;
            setLastJob(job);
            setActiveJobId(null);
            setShowSuccess(true);

            // Invalidate attendee and match queries so the UI refreshes
            queryClient.invalidateQueries({ queryKey: ['attendees', eventId] });
            queryClient.invalidateQueries({ queryKey: ['matches', eventId] });
            queryClient.invalidateQueries({ queryKey: ['matches-attendees', eventId] });

            onMatchingComplete?.();

            const summary = job.resultSummary;
            toast.success('Matching completed!', {
                description: summary
                    ? `${summary.matchesFound} matches found from ${summary.totalAttendees} attendees in ${summary.elapsedMs}ms`
                    : 'All pairs have been scored.',
                duration: 5000,
            });

            // Hide success animation after 4s
            const timer = setTimeout(() => setShowSuccess(false), 4000);
            return () => clearTimeout(timer);
        }
        if (job && job.status === 'failed' && completedJobRef.current !== job.id) {
            completedJobRef.current = job.id;
            setLastJob(job);
            setActiveJobId(null);
        }
    }, [job, eventId, queryClient, onMatchingComplete]);

    const summary = currentJob?.resultSummary;
    const isRunning = currentJob?.status === 'queued' || currentJob?.status === 'processing';
    const isMatchingState = eventStatus === 'matching';

    const stopMutation = useMutation({
        mutationFn: () => stopMatching(apiKey, eventId),
        onSuccess: () => {
            toast.success('Matching stopped', {
                description: 'Event is now accepting registrations without auto-pooling.',
            });
            onMatchingComplete?.();
        },
        onError: (err: Error) => {
            toast.error('Failed to stop matching', { description: err.message });
        },
    });

    return (
        <Card className={showSuccess ? 'ring-2 ring-green-500/30 transition-all duration-500' : 'transition-all duration-500'}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CardTitle className="text-base">Matching Engine</CardTitle>
                        {isMatchingState && (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0 animate-pulse">
                                LIVE
                            </Badge>
                        )}
                    </div>
                    {currentJob && <JobStatusBadge status={currentJob.status} />}
                </div>
                {isMatchingState && (
                    <p className="text-xs text-muted-foreground mt-1">Matching is active — new registrations are automatically added to the pool.</p>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Success banner */}
                {showSuccess && summary && (
                    <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700 animate-in fade-in slide-in-from-top-1 duration-300">
                        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                            <p className="font-medium">Matching Complete!</p>
                            <p className="text-xs mt-0.5">
                                Found <strong>{summary.matchesFound}</strong> matches from <strong>{summary.totalAttendees}</strong> attendees •{' '}
                                {summary.totalPairsScored.toLocaleString()} pairs scored in {summary.elapsedMs}ms
                            </p>
                        </div>
                        <Sparkles className="h-4 w-4 shrink-0 text-green-600 animate-pulse" />
                    </div>
                )}

                {/* Stats */}
                {summary && !showSuccess && (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <p className="text-muted-foreground">Attendees</p>
                            <p className="font-semibold">{summary.totalAttendees}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Pairs Scored</p>
                            <p className="font-semibold">{summary.totalPairsScored.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Matches Found</p>
                            <p className="font-semibold">{summary.matchesFound}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Elapsed</p>
                            <p className="font-semibold">{summary.elapsedMs}ms</p>
                        </div>
                    </div>
                )}

                {/* Progress */}
                {isRunning && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Processing attendee pairs…</span>
                        </div>
                        <Progress value={undefined} className="h-2 animate-pulse" />
                        <p className="text-xs text-muted-foreground">Scoring all unique pairs and storing qualifying matches</p>
                    </div>
                )}

                {/* Error message */}
                {currentJob?.status === 'failed' && currentJob.error && (
                    <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                            <p className="font-medium">Matching Failed</p>
                            <p className="text-xs mt-0.5 break-words">{currentJob.error}</p>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                    {!isRunning && !isMatchingState && (
                        <Button onClick={() => triggerMutation.mutate()} disabled={triggerMutation.isPending} size="sm" className="gap-1.5">
                            {triggerMutation.isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : currentJob?.status === 'completed' ? (
                                <RotateCcw className="h-3.5 w-3.5" />
                            ) : (
                                <Play className="h-3.5 w-3.5" />
                            )}
                            {currentJob?.status === 'completed' ? 'Re-run Matching' : 'Start Matching'}
                        </Button>
                    )}

                    {isRunning && (
                        <Button size="sm" variant="outline" disabled className="gap-1.5">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Processing…
                        </Button>
                    )}

                    {isMatchingState && !isRunning && (
                        <Button
                            onClick={() => stopMutation.mutate()}
                            disabled={stopMutation.isPending}
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-destructive"
                        >
                            {stopMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5" />}
                            Stop Matching
                        </Button>
                    )}
                </div>

                {/* Last updated */}
                {currentJob?.completedAt && !showSuccess && (
                    <p className="text-xs text-muted-foreground">Completed {new Date(currentJob.completedAt).toLocaleString()}</p>
                )}
            </CardContent>
        </Card>
    );
}
