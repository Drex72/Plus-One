import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getEvents } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { EventsContent } from '@/components/events/EventsContent';

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string }> }) {
    const session = await getSession();
    if (!session) redirect('/login');

    const params = await searchParams;
    const page = Number(params.page) || 1;
    const search = params.search || '';

    const eventsRes = await getEvents(session.apiKey, {
        page,
        pageSize: 20,
        search: search || undefined,
    });
    const events = eventsRes.data ?? [];

    return (
        <>
            <Header title="Events" session={session} />
            <div className="px-6 py-8 max-w-7xl">
                <EventsContent initialEvents={events} currentPage={page} currentSearch={search} />
            </div>
        </>
    );
}
