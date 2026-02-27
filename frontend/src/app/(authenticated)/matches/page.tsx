import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getEvents } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { MatchesContent } from '@/components/matches/MatchesContent';

export default async function MatchesPage() {
    const session = await getSession();
    if (!session) redirect('/login');

    const eventsRes = await getEvents(session.apiKey, { pageSize: 100 });
    const events = eventsRes.data ?? [];

    return (
        <>
            <Header title="Matches" session={session} />
            <div className="px-6 py-8 max-w-7xl">
                <MatchesContent events={events} />
            </div>
        </>
    );
}
