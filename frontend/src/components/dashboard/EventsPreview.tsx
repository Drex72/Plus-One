import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EventStatusBadge } from '@/components/shared/StatusBadges';
import { EmptyState } from '@/components/shared/EmptyState';
import { ArrowRight, CalendarDays } from 'lucide-react';
import type { Event } from '@/lib/types';

export function DashboardEventsPreview({ events }: { events: Event[] }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Recent Events</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/events" className="gap-1">
                        View all <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </Button>
            </CardHeader>
            <CardContent>
                {events.length === 0 ? (
                    <EmptyState
                        title="No events yet"
                        description="Create your first event to get started with matching."
                        icon={<CalendarDays className="h-6 w-6 text-muted-foreground" />}
                        action={
                            <Button size="sm" asChild>
                                <Link href="/events">Go to Events</Link>
                            </Button>
                        }
                    />
                ) : (
                    <div className="divide-y">
                        {events.map((event) => (
                            <div key={event.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                                <div className="min-w-0 flex-1 mr-3">
                                    <p className="text-sm font-medium truncate capitalize">{event.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {event.startsAt ? new Date(event.startsAt).toLocaleDateString() : 'No date set'}
                                    </p>
                                </div>
                                <EventStatusBadge status={event.status} />
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
