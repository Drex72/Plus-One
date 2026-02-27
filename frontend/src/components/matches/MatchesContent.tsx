'use client';

import { useState, useMemo, useTransition, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { MatchStatusBadge } from '@/components/shared/StatusBadges';
import { EmptyState } from '@/components/shared/EmptyState';
import { MatchDetailDialog } from './MatchDetailDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/lib/hooks/useSession';
import { updateMatchStatus } from '@/lib/api';
import { exportMatches } from '@/lib/export';
import { Slider } from '@/components/ui/slider';
import { GitCompareArrows, Sparkles, Loader2, Brain, Download, CheckCircle, XCircle, BarChart3, SlidersHorizontal, Users } from 'lucide-react';
import { toast } from 'sonner';
import type { Event, Match, Attendee, ApiResponse } from '@/lib/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1';

export function MatchesContent({ events }: { events: Event[] }) {
    const { apiKey } = useSession();
    const queryClient = useQueryClient();
    const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id ?? '');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
    const [aiExplanations, setAiExplanations] = useState<Map<string, string>>(new Map());
    const [bulkGenerating, setBulkGenerating] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showDistribution, setShowDistribution] = useState(false);
    const [minScore, setMinScore] = useState(0);
    const [showScoreFilter, setShowScoreFilter] = useState(false);
    const [showPool, setShowPool] = useState(false);
    const [, startTransition] = useTransition();

    /* ── Fetch matches ── */
    const { data, isLoading } = useQuery<Match[]>({
        queryKey: ['matches', selectedEventId],
        queryFn: async () => {
            if (!selectedEventId) return [];
            const res = await fetch(`${BASE_URL}/matching/${selectedEventId}/matches?pageSize=100`, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey,
                },
                cache: 'no-store',
            });
            if (!res.ok) throw new Error(`Failed: ${res.status}`);
            const json: ApiResponse<Match[]> = await res.json();
            return json.data;
        },
        enabled: Boolean(selectedEventId && apiKey),
    });

    /* ── Fetch attendees for name lookup ── */
    const { data: attendeesData } = useQuery<Attendee[]>({
        queryKey: ['matches-attendees', selectedEventId],
        queryFn: async () => {
            if (!selectedEventId) return [];
            const res = await fetch(`${BASE_URL}/attendees/${selectedEventId}?pageSize=100`, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey,
                },
                cache: 'no-store',
            });
            if (!res.ok) return [];
            const json: ApiResponse<Attendee[]> = await res.json();
            return json.data;
        },
        enabled: Boolean(selectedEventId && apiKey),
    });

    const nameLookup = useMemo(() => {
        const m = new Map<string, string>();
        for (const a of attendeesData ?? []) m.set(a.id, a.name);
        return m;
    }, [attendeesData]);

    const allMatches = data ?? [];
    const matches = allMatches.filter((m) => {
        if (statusFilter !== 'all' && m.status !== statusFilter) return false;
        if (minScore > 0 && m.score < minScore) return false;
        return true;
    });

    // Attendees currently in the matching pool (in_pool status only)
    const poolAttendees = useMemo(() => {
        return (attendeesData ?? []).filter((a) => a.status === 'in_pool');
    }, [attendeesData]);

    const resolveName = (id: string) => nameLookup.get(id) ?? id.slice(0, 8) + '…';

    const selectedEvent = events.find((e) => e.id === selectedEventId);

    // Track AI explanations from individual generation
    const handleExplanationGenerated = useCallback((matchId: string, explanation: string) => {
        setAiExplanations((prev) => {
            const next = new Map(prev);
            next.set(matchId, explanation);
            return next;
        });
    }, []);

    // Bulk status mutation
    const bulkStatusMutation = useMutation({
        mutationFn: async ({ ids, status }: { ids: string[]; status: 'confirmed' | 'rejected' }) => {
            const results = await Promise.allSettled(ids.map((id) => updateMatchStatus(apiKey, selectedEventId, id, status)));
            const failed = results.filter((r) => r.status === 'rejected').length;
            if (failed > 0) throw new Error(`${failed} updates failed`);
        },
        onSuccess: (_, { ids, status }) => {
            toast.success(`${ids.length} matches ${status}`);
            setSelectedIds(new Set());
            queryClient.invalidateQueries({ queryKey: ['matches', selectedEventId] });
            queryClient.invalidateQueries({ queryKey: ['matches-attendees', selectedEventId] });
            queryClient.invalidateQueries({ queryKey: ['attendees', selectedEventId] });
        },
        onError: (err: Error) => toast.error('Bulk update failed', { description: err.message }),
    });

    // Bulk generate explanations for all matches
    const handleBulkGenerate = async () => {
        if (matches.length === 0) return;
        setBulkGenerating(true);
        try {
            const attendeeLookup: Record<string, { name: string; attributes: Record<string, unknown> }> = {};
            for (const a of attendeesData ?? []) {
                attendeeLookup[a.id] = { name: a.name, attributes: a.attributes ?? {} };
            }

            const res = await fetch('/api/ai/explain-matches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    matches: matches.map((m) => ({
                        id: m.id,
                        attendeeAId: m.attendeeAId,
                        attendeeBId: m.attendeeBId,
                        score: m.score,
                        scoreBreakdown: m.scoreBreakdown,
                    })),
                    config: selectedEvent?.matchingConfig,
                    attendees: attendeeLookup,
                }),
            });

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error ?? 'Bulk generation failed');
            }

            const { data: results } = await res.json();
            const newMap = new Map(aiExplanations);
            for (const item of results ?? []) {
                newMap.set(item.matchId, item.explanation);
            }
            setAiExplanations(newMap);
            toast.success(`Generated AI insights for ${results?.length ?? 0} matches`);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed';
            toast.error('AI Error', { description: msg });
        } finally {
            setBulkGenerating(false);
        }
    };

    // Enrich selected match with local AI explanation
    const enrichedMatch = useMemo(() => {
        if (!selectedMatch) return null;
        const localExplanation = aiExplanations.get(selectedMatch.id);
        if (localExplanation && !selectedMatch.aiExplanation) {
            return { ...selectedMatch, aiExplanation: localExplanation };
        }
        return selectedMatch;
    }, [selectedMatch, aiExplanations]);

    // Score distribution
    const scoreDistribution = useMemo(() => {
        const buckets = [
            { range: '0-20', count: 0 },
            { range: '20-40', count: 0 },
            { range: '40-60', count: 0 },
            { range: '60-80', count: 0 },
            { range: '80-100', count: 0 },
        ];
        for (const m of allMatches) {
            if (m.score < 20) buckets[0].count++;
            else if (m.score < 40) buckets[1].count++;
            else if (m.score < 60) buckets[2].count++;
            else if (m.score < 80) buckets[3].count++;
            else buckets[4].count++;
        }
        return buckets;
    }, [allMatches]);

    const maxBucket = Math.max(...scoreDistribution.map((b) => b.count), 1);

    // Selection helpers
    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };
    const toggleAll = () => {
        if (selectedIds.size === matches.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(matches.map((m) => m.id)));
    };

    const pendingSelected = matches.filter((m) => selectedIds.has(m.id) && m.status === 'pending');

    // Pending matches visible in the current filter view (for bulk filter actions)
    const pendingVisible = useMemo(() => matches.filter((m) => m.status === 'pending'), [matches]);

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                <Select
                    value={selectedEventId}
                    onValueChange={(v) => {
                        startTransition(() => setSelectedEventId(v));
                        setSelectedIds(new Set());
                    }}
                >
                    <SelectTrigger className="w-72">
                        <SelectValue placeholder="Select an event" />
                    </SelectTrigger>
                    <SelectContent>
                        {events.map((evt) => (
                            <SelectItem key={evt.id} value={evt.id}>
                                {evt.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={(v) => startTransition(() => setStatusFilter(v))}>
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                </Select>

                <div className="flex gap-2 ml-auto">
                    <Button variant={showPool ? 'default' : 'outline'} size="sm" className="gap-1.5" onClick={() => setShowPool(!showPool)}>
                        <Users className="h-3.5 w-3.5" />
                        Pool ({poolAttendees.length})
                    </Button>
                    <Button
                        variant={showScoreFilter ? 'default' : 'outline'}
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setShowScoreFilter(!showScoreFilter)}
                    >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        Score Filter
                    </Button>
                    {allMatches.length > 0 && (
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowDistribution(!showDistribution)}>
                            <BarChart3 className="h-3.5 w-3.5" />
                            {showDistribution ? 'Hide' : 'Score'} Distribution
                        </Button>
                    )}
                    {matches.length > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => exportMatches(matches, nameLookup, selectedEvent?.name)}
                        >
                            <Download className="h-3.5 w-3.5" />
                            Export CSV
                        </Button>
                    )}
                </div>
            </div>

            {/* Score Filter */}
            {showScoreFilter && (
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 min-w-0">
                                <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="text-sm font-medium whitespace-nowrap">Min Score:</span>
                                <span className="text-sm font-bold text-primary w-10">{minScore}%</span>
                            </div>
                            <Slider value={[minScore]} onValueChange={([v]) => setMinScore(v)} min={0} max={100} step={5} className="flex-1" />
                            {minScore > 0 && (
                                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setMinScore(0)}>
                                    Reset
                                </Button>
                            )}
                        </div>
                        {minScore > 0 && (
                            <p className="text-xs text-muted-foreground mt-2">
                                Showing {matches.length} of {allMatches.length} matches with score &ge; {minScore}%
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Filter Bulk Actions — visible when score filter is active and there are pending matches in view */}
            {showScoreFilter && minScore > 0 && pendingVisible.length > 0 && (
                <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    <Sparkles className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-medium flex-1">
                        {pendingVisible.length} pending match{pendingVisible.length !== 1 ? 'es' : ''} with score &ge; {minScore}%
                    </span>
                    <Button
                        size="sm"
                        className="gap-1.5 h-7"
                        onClick={() =>
                            bulkStatusMutation.mutate({
                                ids: pendingVisible.map((m) => m.id),
                                status: 'confirmed',
                            })
                        }
                        disabled={bulkStatusMutation.isPending}
                    >
                        <CheckCircle className="h-3 w-3" />
                        Confirm All
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 h-7 text-destructive"
                        onClick={() =>
                            bulkStatusMutation.mutate({
                                ids: pendingVisible.map((m) => m.id),
                                status: 'rejected',
                            })
                        }
                        disabled={bulkStatusMutation.isPending}
                    >
                        <XCircle className="h-3 w-3" />
                        Reject All
                    </Button>
                </div>
            )}

            {/* Matching Pool */}
            {showPool && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-600" />
                            Matching Pool
                            <span className="text-muted-foreground font-normal">
                                ({poolAttendees.length} attendee{poolAttendees.length !== 1 ? 's' : ''} waiting)
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {poolAttendees.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4 text-center">
                                No attendees currently in the matching pool. All attendees have been matched or opted out.
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                                {poolAttendees.map((att) => (
                                    <div key={att.id} className="flex items-center gap-2 rounded-lg border p-2">
                                        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-400 uppercase shrink-0">
                                            {att.name.charAt(0)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium capitalize truncate">{att.name}</p>
                                            <p className="text-[10px] text-muted-foreground">In Pool{att.email ? ` · ${att.email}` : ''}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Score Distribution Chart (inline) */}
            {showDistribution && allMatches.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Score Distribution ({allMatches.length} matches)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-2 h-32">
                            {scoreDistribution.map((bucket) => (
                                <div key={bucket.range} className="flex-1 flex flex-col items-center gap-1">
                                    <span className="text-xs font-medium">{bucket.count}</span>
                                    <div
                                        className="w-full rounded-t bg-primary/80 transition-all"
                                        style={{
                                            height: `${(bucket.count / maxBucket) * 100}%`,
                                            minHeight: bucket.count > 0 ? '4px' : '0px',
                                        }}
                                    />
                                    <span className="text-[10px] text-muted-foreground">{bucket.range}%</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Bulk action bar */}
            {selectedIds.size > 0 && (
                <div className="flex items-center gap-3 bg-muted rounded-lg px-4 py-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <span className="text-sm font-medium">{selectedIds.size} selected</span>
                    {pendingSelected.length > 0 && (
                        <>
                            <Button
                                size="sm"
                                className="gap-1 h-7"
                                onClick={() =>
                                    bulkStatusMutation.mutate({
                                        ids: pendingSelected.map((m) => m.id),
                                        status: 'confirmed',
                                    })
                                }
                                disabled={bulkStatusMutation.isPending}
                            >
                                <CheckCircle className="h-3 w-3" />
                                Confirm ({pendingSelected.length})
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 h-7 text-destructive"
                                onClick={() =>
                                    bulkStatusMutation.mutate({
                                        ids: pendingSelected.map((m) => m.id),
                                        status: 'rejected',
                                    })
                                }
                                disabled={bulkStatusMutation.isPending}
                            >
                                <XCircle className="h-3 w-3" />
                                Reject ({pendingSelected.length})
                            </Button>
                        </>
                    )}
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => setSelectedIds(new Set())}>
                        Clear
                    </Button>
                </div>
            )}

            {!selectedEventId ? (
                <EmptyState
                    title="Select an event"
                    description="Choose an event from the dropdown to view its matches."
                    icon={<GitCompareArrows className="h-6 w-6 text-muted-foreground" />}
                />
            ) : isLoading ? (
                <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-14 rounded-lg" />
                    ))}
                </div>
            ) : matches.length === 0 ? (
                <EmptyState
                    title="No matches"
                    description={
                        statusFilter !== 'all'
                            ? 'No matches with this status. Try changing the filter.'
                            : 'Run the matching engine on this event to generate matches.'
                    }
                    icon={<GitCompareArrows className="h-6 w-6 text-muted-foreground" />}
                />
            ) : (
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-10">
                                    <Checkbox checked={selectedIds.size === matches.length && matches.length > 0} onCheckedChange={toggleAll} />
                                </TableHead>
                                <TableHead>Attendee A</TableHead>
                                <TableHead>Attendee B</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="hidden md:table-cell">Strategy</TableHead>
                                <TableHead className="w-10" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {matches.map((match) => (
                                <TableRow
                                    key={match.id}
                                    className={`cursor-pointer hover:bg-muted/50 ${match.status === 'rejected' ? 'bg-red-50/50' : ''} ${
                                        selectedIds.has(match.id) ? 'bg-primary/5' : ''
                                    }`}
                                    onClick={() => setSelectedMatch(match)}
                                >
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <Checkbox checked={selectedIds.has(match.id)} onCheckedChange={() => toggleSelect(match.id)} />
                                    </TableCell>
                                    <TableCell className="font-medium text-sm capitalize truncate max-w-[180px]">
                                        {resolveName(match.attendeeAId)}
                                    </TableCell>
                                    <TableCell className="text-sm capitalize truncate max-w-[180px]">{resolveName(match.attendeeBId)}</TableCell>
                                    <TableCell>
                                        <span
                                            className={`text-sm font-semibold ${
                                                match.score >= 70 ? 'text-green-600' : match.score >= 40 ? 'text-yellow-600' : 'text-red-600'
                                            }`}
                                        >
                                            {Math.round(match.score)}%
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <MatchStatusBadge status={match.status} />
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground capitalize">
                                        {match.strategy.replace(/_/g, ' ')}
                                    </TableCell>
                                    <TableCell>
                                        {(match.aiExplanation || aiExplanations.has(match.id)) && <Brain className="h-3.5 w-3.5 text-violet-500" />}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <p className="text-sm text-muted-foreground">
                {matches.length} match{matches.length !== 1 ? 'es' : ''}
                {statusFilter !== 'all' ? ` (${statusFilter})` : ''}
            </p>

            {/* Bulk AI generate */}
            {matches.length > 0 && (
                <div className="flex items-center gap-3 bg-gradient-to-r from-violet-50/80 to-blue-50/80 dark:from-violet-950/20 dark:to-blue-950/20 border border-violet-200/50 dark:border-violet-800/30 rounded-lg px-4 py-3">
                    <Brain className="h-5 w-5 text-violet-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">AI Match Insights</p>
                        <p className="text-xs text-muted-foreground">Generate natural-language explanations for why each pair was matched.</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={handleBulkGenerate} disabled={bulkGenerating} className="gap-1.5 shrink-0">
                        {bulkGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        {bulkGenerating ? 'Generating...' : 'Generate All'}
                    </Button>
                </div>
            )}

            <MatchDetailDialog
                match={enrichedMatch}
                nameLookup={nameLookup}
                attendeesData={attendeesData ?? []}
                matchingConfig={selectedEvent?.matchingConfig}
                open={!!selectedMatch}
                onClose={() => setSelectedMatch(null)}
                onExplanationGenerated={handleExplanationGenerated}
                onStatusChanged={(matchId, status) => {
                    // Update local state to reflect the change immediately
                    setSelectedMatch((prev) => (prev?.id === matchId ? { ...prev, status } : prev));
                    // Refresh attendees to update pool
                    queryClient.invalidateQueries({ queryKey: ['matches-attendees', selectedEventId] });
                    queryClient.invalidateQueries({ queryKey: ['attendees', selectedEventId] });
                }}
            />
        </div>
    );
}
