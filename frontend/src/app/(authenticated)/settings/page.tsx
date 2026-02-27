import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { Header } from '@/components/layout/Header';
import { SettingsContent } from '@/components/settings/SettingsContent';

export default async function SettingsPage() {
    const session = await getSession();
    if (!session) redirect('/login');

    return (
        <>
            <Header title="Settings" session={session} />
            <div className="px-6 py-8 max-w-4xl">
                <SettingsContent session={session} />
            </div>
        </>
    );
}
