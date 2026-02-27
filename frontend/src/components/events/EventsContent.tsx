'use client';

import { useState, useTransition, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EventStatusBadge } from '@/components/shared/StatusBadges';
import { EmptyState } from '@/components/shared/EmptyState';
import { EventDrawer } from './EventDrawer';
import { CreateEventDrawer } from './CreateEventDrawer';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { Eye, Plus, CalendarDays, Search } from 'lucide-react';
import type { Event, EventStatus } from '@/lib/types';

export function EventsContent({ initialEvents, currentPage, currentSearch }: { initialEvents: Event[]; currentPage: number; currentSearch: string }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [search, setSearch] = useState(currentSearch);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const debouncedSearch = useDebounce(search, 300);

    // Keep selectedEvent in sync when initialEvents refreshes (e.g. after edit / status change)
    useEffect(() => {
        if (selectedEvent) {
            const updated = initialEvents.find((e) => e.id === selectedEvent.id);
            if (updated && JSON.stringify(updated) !== JSON.stringify(selectedEvent)) {
                setSelectedEvent(updated);
            }
        }
    }, [initialEvents]); // eslint-disable-line react-hooks/exhaustive-deps

    // Navigate with search params when search changes
    const handleSearchChange = useCallback(
        (value: string) => {
            setSearch(value);
            startTransition(() => {
                const params = new URLSearchParams();
                if (value) params.set('search', value);
                router.push(`/events?${params.toString()}`);
            });
        },
        [router],
    );

    const filteredEvents = statusFilter === 'all' ? initialEvents : initialEvents.filter((e) => e.status === statusFilter);

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <div className="flex gap-3 flex-1">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search events…" value={search} onChange={(e) => handleSearchChange(e.target.value)} className="pl-9" />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All statuses</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="matching">Matching</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    Create Event
                </Button>
            </div>

            {/* Table */}
            {filteredEvents.length === 0 ? (
                <EmptyState
                    title="No events found"
                    description={search ? 'Try adjusting your search or filters.' : 'Create your first event to start matching attendees.'}
                    icon={<CalendarDays className="h-6 w-6 text-muted-foreground" />}
                    action={
                        !search ? (
                            <Button size="sm" onClick={() => setCreateOpen(true)}>
                                Create Event
                            </Button>
                        ) : undefined
                    }
                />
            ) : (
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead className="hidden sm:table-cell">Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="hidden md:table-cell">Config</TableHead>
                                <TableHead className="w-12" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredEvents.map((event) => (
                                <TableRow key={event.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedEvent(event)}>
                                    <TableCell>
                                        <div className="min-w-0">
                                            <p className="font-medium text-sm capitalize truncate">{event.name}</p>
                                            {event.description && (
                                                <p className="text-xs text-muted-foreground truncate max-w-xs">{event.description}</p>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                                        {event.startsAt ? new Date(event.startsAt).toLocaleDateString() : '—'}
                                    </TableCell>
                                    <TableCell>
                                        <EventStatusBadge status={event.status} />
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                                        {event.matchingConfig ? `${event.matchingConfig.attributes?.length} attrs` : 'No config'}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedEvent(event);
                                            }}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Pagination placeholder */}
            {filteredEvents.length > 0 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        Showing {filteredEvents.length} event
                        {filteredEvents.length !== 1 ? 's' : ''}
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage <= 1}
                            onClick={() => {
                                startTransition(() => {
                                    const params = new URLSearchParams();
                                    params.set('page', String(currentPage - 1));
                                    if (search) params.set('search', search);
                                    router.push(`/events?${params.toString()}`);
                                });
                            }}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={filteredEvents.length < 20}
                            onClick={() => {
                                startTransition(() => {
                                    const params = new URLSearchParams();
                                    params.set('page', String(currentPage + 1));
                                    if (search) params.set('search', search);
                                    router.push(`/events?${params.toString()}`);
                                });
                            }}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}

            {/* Drawers and modals */}
            <EventDrawer event={selectedEvent} open={!!selectedEvent} onClose={() => setSelectedEvent(null)} />
            <CreateEventDrawer open={createOpen} onOpenChange={setCreateOpen} />
        </div>
    );
}
