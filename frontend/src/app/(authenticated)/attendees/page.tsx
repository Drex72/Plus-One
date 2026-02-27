import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getEvents } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { AttendeesContent } from '@/components/attendees/AttendeesContent';

export default async function AttendeesPage() {
    const session = await getSession();
    if (!session) redirect('/login');

    // Fetch events so the user can pick which event to view attendees for
    const eventsRes = await getEvents(session.apiKey, { pageSize: 100 });
    const events = eventsRes.data ?? [];

    return (
        <>
            <Header title="Attendees" session={session} />
            <div className="px-6 py-8 max-w-7xl">
                <AttendeesContent events={events} />
            </div>
        </>
    );
}
