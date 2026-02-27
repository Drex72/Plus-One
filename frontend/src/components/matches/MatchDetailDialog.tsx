'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { MatchStatusBadge } from '@/components/shared/StatusBadges';
import { useSession } from '@/lib/hooks/useSession';
import { updateMatchStatus } from '@/lib/api';
import { Brain, CheckCircle, Loader2, Sparkles, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Match, Attendee, MatchingConfig } from '@/lib/types';

export function MatchDetailDialog({
    match,
    nameLookup,
    attendeesData,
    matchingConfig,
    open,
    onClose,
    onExplanationGenerated,
    onStatusChanged,
}: {
    match: Match | null;
    nameLookup?: Map<string, string>;
    attendeesData?: Attendee[];
    matchingConfig?: MatchingConfig | null;
    open: boolean;
    onClose: () => void;
    onExplanationGenerated?: (matchId: string, explanation: string) => void;
    onStatusChanged?: (matchId: string, status: 'confirmed' | 'rejected') => void;
}) {
    const { apiKey } = useSession();
    const queryClient = useQueryClient();
    const [generating, setGenerating] = useState(false);
    const [localExplanation, setLocalExplanation] = useState<string | null>(null);

    const statusMutation = useMutation({
        mutationFn: ({ matchId, status }: { matchId: string; status: 'confirmed' | 'rejected' }) =>
            updateMatchStatus(apiKey, match!.eventId, matchId, status),
        onSuccess: (_, variables) => {
            toast.success(`Match ${variables.status}`);
            queryClient.invalidateQueries({ queryKey: ['matches'] });
            onStatusChanged?.(variables.matchId, variables.status);
        },
        onError: (err: Error) => toast.error('Failed to update match', { description: err.message }),
    });

    if (!match) return null;

    const explanation = localExplanation ?? match.aiExplanation;
    const breakdownEntries = Object.entries(match.scoreBreakdown ?? {});

    const handleGenerateExplanation = async () => {
        setGenerating(true);
        try {
            const attendeeLookup: Record<string, { name: string; attributes: Record<string, unknown> }> = {};
            for (const a of attendeesData ?? []) {
                attendeeLookup[a.id] = { name: a.name, attributes: a.attributes ?? {} };
            }

            const res = await fetch('/api/ai/explain-matches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    matches: [
                        {
                            id: match.id,
                            attendeeAId: match.attendeeAId,
                            attendeeBId: match.attendeeBId,
                            score: match.score,
                            scoreBreakdown: match.scoreBreakdown,
                        },
                    ],
                    config: matchingConfig,
                    attendees: attendeeLookup,
                }),
            });

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error ?? 'Failed to generate explanation');
            }

            const { data } = await res.json();
            const result = data?.[0]?.explanation ?? 'Explanation unavailable.';
            setLocalExplanation(result);
            onExplanationGenerated?.(match.id, result);
            toast.success('AI explanation generated!');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed';
            toast.error('AI Error', { description: msg });
        } finally {
            setGenerating(false);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                if (!v) {
                    setLocalExplanation(null);
                    onClose();
                }
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Match Details</DialogTitle>
                    <DialogDescription>Score breakdown and match information</DialogDescription>
                </DialogHeader>

                <div className="space-y-5">
                    {/* Overall score */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Overall Score</p>
                            <p className="text-3xl font-bold">{Math.round(match.score)}%</p>
                        </div>
                        <MatchStatusBadge status={match.status} />
                    </div>

                    <Progress value={match.score} className="h-2" />

                    {/* Confirm / Reject actions */}
                    {match.status === 'pending' && (
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                className="gap-1.5 flex-1"
                                onClick={() => statusMutation.mutate({ matchId: match.id, status: 'confirmed' })}
                                disabled={statusMutation.isPending}
                            >
                                {statusMutation.isPending ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <CheckCircle className="h-3.5 w-3.5" />
                                )}
                                Confirm Match
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 flex-1 text-destructive hover:text-destructive"
                                onClick={() => statusMutation.mutate({ matchId: match.id, status: 'rejected' })}
                                disabled={statusMutation.isPending}
                            >
                                <XCircle className="h-3.5 w-3.5" />
                                Reject
                            </Button>
                        </div>
                    )}

                    <Separator />

                    {/* AI Explanation */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <Brain className="h-4 w-4 text-violet-600" />
                                <h4 className="text-sm font-semibold">AI Insight</h4>
                            </div>
                            {!explanation && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleGenerateExplanation}
                                    disabled={generating}
                                    className="gap-1 h-7 text-xs"
                                >
                                    {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                    {generating ? 'Generating...' : 'Generate'}
                                </Button>
                            )}
                        </div>
                        {explanation ? (
                            <div className="bg-gradient-to-br from-violet-50/80 to-blue-50/80 dark:from-violet-950/20 dark:to-blue-950/20 border border-violet-200/50 dark:border-violet-800/30 rounded-lg p-3">
                                <p className="text-sm text-muted-foreground leading-relaxed">{explanation}</p>
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground">
                                Click &quot;Generate&quot; to get an AI-powered explanation for this match.
                            </p>
                        )}
                    </div>

                    <Separator />

                    {/* Breakdown */}
                    {breakdownEntries.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold">Score Breakdown</h4>
                            {breakdownEntries.map(([field, rawScore]) => {
                                // Backend stores breakdown as 0.0–1.0, convert to percentage
                                const pct = rawScore <= 1 ? rawScore * 100 : rawScore;
                                return (
                                    <div key={field} className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="capitalize">{field.replace(/_/g, ' ')}</span>
                                            <span className="font-medium">{Math.round(pct)}%</span>
                                        </div>
                                        <Progress value={pct} className="h-1.5" />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <Separator />

                    {/* IDs  */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <p className="text-muted-foreground">Attendee A</p>
                            <p className="font-medium capitalize truncate">{nameLookup?.get(match.attendeeAId) ?? match.attendeeAId}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Attendee B</p>
                            <p className="font-medium capitalize truncate">{nameLookup?.get(match.attendeeBId) ?? match.attendeeBId}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Strategy</p>
                            <p className="font-medium capitalize">{match.strategy.replace(/_/g, ' ')}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Created</p>
                            <p>{new Date(match.createdAt).toLocaleDateString()}</p>
                        </div>
                    </div>

                    <p className="text-xs text-muted-foreground">Match ID: {match.id}</p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
