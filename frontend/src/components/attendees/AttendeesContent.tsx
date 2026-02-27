'use client';

import { useState, useMemo, useTransition } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AttendeeStatusBadge } from '@/components/shared/StatusBadges';
import { EmptyState } from '@/components/shared/EmptyState';
import { AttendeeDrawer } from './AttendeeDrawer';
import { ImportAttendeesDrawer } from './ImportAttendeesDrawer';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/lib/hooks/useSession';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { exportAttendees } from '@/lib/export';
import { Users, Search, MoreHorizontal, Pencil, Trash2, RefreshCw, GitCompareArrows, Eye, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { deleteAttendee } from '@/lib/api';
import type { Event, Attendee, Match, ApiResponse } from '@/lib/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1';

/* Max dynamic attribute columns to render */
const MAX_ATTR_COLS = 4;

export function AttendeesContent({ events }: { events: Event[] }) {
    const { apiKey } = useSession();
    const queryClient = useQueryClient();
    const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id ?? '');
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 300);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);
    const [matchesForAttendee, setMatchesForAttendee] = useState<{
        attendee: Attendee;
        matches: Match[];
    } | null>(null);
    const [, startTransition] = useTransition();
    const [importOpen, setImportOpen] = useState(false);

    /* ── Fetch attendees ── */
    const { data, isLoading } = useQuery<Attendee[]>({
        queryKey: ['attendees', selectedEventId, debouncedSearch],
        queryFn: async () => {
            if (!selectedEventId) return [];
            const qs = new URLSearchParams({ pageSize: '100' });
            if (debouncedSearch) qs.set('search', debouncedSearch);
            const res = await fetch(`${BASE_URL}/attendees/${selectedEventId}?${qs}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey,
                },
                cache: 'no-store',
            });
            if (!res.ok) throw new Error(`Failed: ${res.status}`);
            const json: ApiResponse<Attendee[]> = await res.json();
            return json.data;
        },
        enabled: Boolean(selectedEventId && apiKey),
    });

    const allAttendees = data ?? [];

    /* ── Filter by status ── */
    const attendees = useMemo(() => {
        if (statusFilter === 'all') return allAttendees;
        return allAttendees.filter((a) => a.status === statusFilter);
    }, [allAttendees, statusFilter]);

    /* ── Derive dynamic attribute column keys ── */
    const attrKeys = useMemo(() => {
        const keySet = new Set<string>();
        for (const att of attendees) {
            if (att.attributes) {
                for (const k of Object.keys(att.attributes)) keySet.add(k);
            }
            if (keySet.size >= MAX_ATTR_COLS) break;
        }
        return Array.from(keySet).slice(0, MAX_ATTR_COLS);
    }, [attendees]);

    /* ── Delete mutation ── */
    const deleteMutation = useMutation({
        mutationFn: (attendeeId: string) => deleteAttendee(apiKey, selectedEventId, attendeeId),
        onSuccess: () => {
            toast.success('Attendee deleted');
            queryClient.invalidateQueries({
                queryKey: ['attendees', selectedEventId],
            });
        },
        onError: (err: Error) => toast.error('Delete failed', { description: err.message }),
    });

    /* ── Rematch mutation ── */
    const rematchMutation = useMutation({
        mutationFn: async (attendeeId: string) => {
            const res = await fetch(`${BASE_URL}/matching/${selectedEventId}/find-matches`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey,
                },
                body: JSON.stringify({ attendeeId, limit: 10, includeBreakdown: true }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.message ?? `Failed: ${res.status}`);
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success('Rematch completed — check the Matches tab');
            queryClient.invalidateQueries({
                queryKey: ['matches', selectedEventId],
            });
        },
        onError: (err: Error) => toast.error('Rematch failed', { description: err.message }),
    });

    /* ── View matches for attendee ── */
    const viewMatchesMutation = useMutation({
        mutationFn: async (attendeeId: string) => {
            const res = await fetch(`${BASE_URL}/matching/${selectedEventId}/matches?pageSize=100`, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey,
                },
                cache: 'no-store',
            });
            if (!res.ok) throw new Error(`Failed: ${res.status}`);
            const json: ApiResponse<Match[]> = await res.json();
            return json.data.filter((m) => m.attendeeAId === attendeeId || m.attendeeBId === attendeeId);
        },
    });

    const handleViewMatches = async (att: Attendee) => {
        const matches = await viewMatchesMutation.mutateAsync(att.id);
        if (matches.length === 0) {
            toast.info('No matches found for this attendee');
        } else {
            setMatchesForAttendee({ attendee: att, matches });
        }
    };

    const handleDelete = (att: Attendee) => {
        if (!window.confirm(`Delete "${att.name}"? This action is irreversible.`)) return;
        deleteMutation.mutate(att.id);
    };

    const formatAttrValue = (val: unknown): string => {
        if (val == null) return '—';
        if (Array.isArray(val)) return val.join(', ');
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
    };

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                <Select value={selectedEventId} onValueChange={(v) => startTransition(() => setSelectedEventId(v))}>
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

                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search attendees…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_pool">In Pool</SelectItem>
                        <SelectItem value="matched">Matched</SelectItem>
                        <SelectItem value="opted_out">Opted Out</SelectItem>
                    </SelectContent>
                </Select>

                <div className="flex gap-2 ml-auto">
                    {attendees.length > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => {
                                const event = events.find((e) => e.id === selectedEventId);
                                exportAttendees(attendees, event?.name);
                            }}
                        >
                            <Download className="h-3.5 w-3.5" />
                            Export CSV
                        </Button>
                    )}
                    {selectedEventId && (
                        <Button size="sm" className="gap-1.5" onClick={() => setImportOpen(true)}>
                            <Upload className="h-3.5 w-3.5" />
                            Import CSV
                        </Button>
                    )}
                </div>
            </div>

            {!selectedEventId ? (
                <EmptyState
                    title="Select an event"
                    description="Choose an event from the dropdown to view its attendees."
                    icon={<Users className="h-6 w-6 text-muted-foreground" />}
                />
            ) : isLoading ? (
                <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-14 rounded-lg" />
                    ))}
                </div>
            ) : attendees.length === 0 ? (
                <EmptyState
                    title="No attendees"
                    description="No attendees have registered for this event yet."
                    icon={<Users className="h-6 w-6 text-muted-foreground" />}
                />
            ) : (
                <>
                    <div className="border rounded-lg overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="hidden sm:table-cell">Email</TableHead>
                                    {attrKeys.map((k) => (
                                        <TableHead key={k} className="hidden lg:table-cell capitalize">
                                            {k.replace(/_/g, ' ')}
                                        </TableHead>
                                    ))}
                                    <TableHead>Status</TableHead>
                                    <TableHead className="hidden md:table-cell">Registered</TableHead>
                                    <TableHead className="w-10" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {attendees.map((att) => (
                                    <TableRow key={att.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedAttendee(att)}>
                                        <TableCell className="font-medium text-sm capitalize truncate max-w-[200px]">{att.name}</TableCell>
                                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground truncate max-w-[200px]">
                                            {att.email ?? '—'}
                                        </TableCell>
                                        {attrKeys.map((k) => (
                                            <TableCell
                                                key={k}
                                                className="hidden lg:table-cell text-sm text-muted-foreground truncate max-w-[160px] capitalize"
                                            >
                                                {formatAttrValue(att.attributes?.[k])}
                                            </TableCell>
                                        ))}
                                        <TableCell>
                                            <AttendeeStatusBadge status={att.status} />
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                            {new Date(att.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedAttendee(att);
                                                        }}
                                                    >
                                                        <Eye className="h-4 w-4 mr-2" /> View Details
                                                    </DropdownMenuItem>
                                                    {att.status === 'matched' && (
                                                        <DropdownMenuItem
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleViewMatches(att);
                                                            }}
                                                        >
                                                            <GitCompareArrows className="h-4 w-4 mr-2" /> View Matches
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    {att.status === 'matched' && (
                                                        <DropdownMenuItem
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                rematchMutation.mutate(att.id);
                                                            }}
                                                        >
                                                            <RefreshCw className="h-4 w-4 mr-2" /> Rematch
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDelete(att);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <p className="text-sm text-muted-foreground">
                        {attendees.length} attendee{attendees.length !== 1 ? 's' : ''}
                    </p>
                </>
            )}

            {/* Attendee detail drawer */}
            <AttendeeDrawer attendee={selectedAttendee} open={!!selectedAttendee} onClose={() => setSelectedAttendee(null)} />

            {/* Quick view matches dialog */}
            {matchesForAttendee && (
                <MatchesQuickView
                    attendeeId={matchesForAttendee.attendee.id}
                    attendeeName={matchesForAttendee.attendee.name}
                    matches={matchesForAttendee.matches}
                    attendees={attendees}
                    open
                    onClose={() => setMatchesForAttendee(null)}
                />
            )}

            {/* Import CSV drawer */}
            <ImportAttendeesDrawer
                eventId={selectedEventId}
                open={importOpen}
                onClose={() => setImportOpen(false)}
                onImported={() => {
                    queryClient.invalidateQueries({
                        queryKey: ['attendees', selectedEventId],
                    });
                }}
            />
        </div>
    );
}

/* ─── Quick inline matches dialog ─── */
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { MatchStatusBadge } from '@/components/shared/StatusBadges';
import { UserCircle, Heart, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';

function MatchesQuickView({
    attendeeId,
    attendeeName,
    matches,
    attendees,
    open,
    onClose,
}: {
    attendeeId: string;
    attendeeName: string;
    matches: Match[];
    attendees: Attendee[];
    open: boolean;
    onClose: () => void;
}) {
    const lookup = useMemo(() => {
        const m = new Map<string, Attendee>();
        for (const a of attendees) m.set(a.id, a);
        return m;
    }, [attendees]);

    const [expandedId, setExpandedId] = useState<string | null>(null);

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="capitalize">Matches for {attendeeName}</DialogTitle>
                    <DialogDescription>
                        {matches.length} match{matches.length !== 1 ? 'es' : ''} found
                    </DialogDescription>
                </DialogHeader>
                <div className="overflow-y-auto space-y-3 flex-1 pr-1">
                    {matches.map((m) => {
                        const partnerId = m.attendeeAId === attendeeId ? m.attendeeBId : m.attendeeAId;
                        const partner = lookup.get(partnerId);
                        const partnerName = partner?.name ?? partnerId.slice(0, 8) + '…';
                        const profileEntries = Object.entries(partner?.attributes ?? {});
                        const prefs = partner?.preferences ?? [];
                        const isExpanded = expandedId === m.id;

                        return (
                            <div key={m.id} className="rounded-lg border overflow-hidden">
                                {/* Match header — always visible */}
                                <button
                                    type="button"
                                    className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                                    onClick={() => setExpandedId(isExpanded ? null : m.id)}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                                            <UserCircle className="h-4.5 w-4.5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold capitalize truncate">{partnerName}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Score: <span className="font-medium text-foreground">{Math.round(m.score)}%</span>
                                                {m.scoreBreakdown && Object.keys(m.scoreBreakdown).length > 0 && (
                                                    <span className="ml-2">
                                                        (
                                                        {Object.entries(m.scoreBreakdown)
                                                            .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${Math.round(Number(v) * 100)}%`)
                                                            .join(', ')}
                                                        )
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <MatchStatusBadge status={m.status} />
                                        {isExpanded ? (
                                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </div>
                                </button>

                                {/* Expanded: profile + preferences */}
                                {isExpanded && (
                                    <div className="border-t px-4 py-3 space-y-4 bg-muted/20">
                                        {/* Profile */}
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-2">
                                                <UserCircle className="h-3.5 w-3.5 text-muted-foreground" />
                                                <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profile</h5>
                                            </div>
                                            {profileEntries.length > 0 ? (
                                                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                                                    {profileEntries.map(([key, value]) => (
                                                        <div key={key} className="flex items-start justify-between gap-2 py-1">
                                                            <span className="text-xs font-medium capitalize text-muted-foreground">
                                                                {key.replace(/_/g, ' ')}
                                                            </span>
                                                            <span className="text-xs capitalize text-right min-w-0">
                                                                {Array.isArray(value)
                                                                    ? (value as string[]).map((v) => (
                                                                          <Badge
                                                                              key={String(v)}
                                                                              variant="secondary"
                                                                              className="text-[10px] capitalize ml-1"
                                                                          >
                                                                              {String(v)}
                                                                          </Badge>
                                                                      ))
                                                                    : String(value)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-muted-foreground">No profile attributes.</p>
                                            )}
                                        </div>

                                        {/* Preferences */}
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-2">
                                                <Heart className="h-3.5 w-3.5 text-muted-foreground" />
                                                <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preferences</h5>
                                            </div>
                                            {prefs.length > 0 ? (
                                                <div className="space-y-1.5">
                                                    {prefs.map((pref, pi) => (
                                                        <div key={pi} className="flex items-center justify-between gap-3 py-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <SlidersHorizontal className="h-3 w-3 text-muted-foreground" />
                                                                <span className="text-xs font-medium capitalize">
                                                                    {pref.field.replace(/_/g, ' ')}
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-1 justify-end">
                                                                <Badge variant="outline" className="text-[10px]">
                                                                    {pref.type}
                                                                </Badge>
                                                                {Array.isArray(pref.value) ? (
                                                                    (pref.value as string[]).map((v, vi) => (
                                                                        <Badge key={vi} variant="secondary" className="text-[10px] capitalize">
                                                                            {String(v)}
                                                                        </Badge>
                                                                    ))
                                                                ) : (
                                                                    <span className="text-xs text-muted-foreground">
                                                                        {JSON.stringify(pref.value)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-muted-foreground">No preferences set.</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </DialogContent>
        </Dialog>
    );
}
