import { Suspense } from 'react';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { getEvents } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { StatsCard } from '@/components/shared/StatsCard';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, Users, GitCompareArrows, Activity } from 'lucide-react';
import { DashboardEventsPreview } from '@/components/dashboard/EventsPreview';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';

export default async function DashboardPage() {
    const session = await getSession();
    if (!session) redirect('/login');

    const eventsRes = await getEvents(session.apiKey, { pageSize: 100 });
    const events = eventsRes.data ?? [];

    const totalEvents = events.length;
    const activeEvents = events.filter((e) => e.status === 'active' || e.status === 'matching').length;
    const completedEvents = events.filter((e) => e.status === 'completed').length;

    return (
        <>
            <Header title="Dashboard" session={session} />
            <div className="px-6 py-8 space-y-8 max-w-7xl">
                {/* Stats row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatsCard title="Total Events" value={totalEvents} icon={CalendarDays} />
                    <StatsCard title="Active Events" value={activeEvents} icon={Activity} subtitle="Currently accepting attendees" />
                    <StatsCard title="Completed" value={completedEvents} icon={GitCompareArrows} />
                    <StatsCard title="Tenant" value={session.tenant.name} icon={Users} subtitle={session.role} />
                </div>

                {/* Analytics Charts */}
                <DashboardCharts />

                {/* Recent events preview */}
                <Suspense fallback={<Skeleton className="h-80 rounded-xl" />}>
                    <DashboardEventsPreview events={events.slice(0, 5)} />
                </Suspense>
            </div>
        </>
    );
}
