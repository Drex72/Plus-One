'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CalendarDays, Users, GitCompareArrows, Settings, LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { logoutAction } from '@/app/actions';
import type { Session } from '@/lib/types';

const NAV_ITEMS = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/events', label: 'Events', icon: CalendarDays },
    { href: '/attendees', label: 'Attendees', icon: Users },
    { href: '/matches', label: 'Matches', icon: GitCompareArrows },
    { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ session }: { session: Session }) {
    const pathname = usePathname();

    const initials = session.tenant.name
        .split(/\s/)
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return (
        <aside className="hidden md:flex flex-col w-64 border-r border-border bg-white h-screen sticky top-0">
            {/* Logo */}
            <div className="flex items-center gap-2 px-6 py-5">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                    <span className="text-white font-bold text-sm">P1</span>
                </div>
                <span className="text-lg font-semibold tracking-tight">Plus One</span>
            </div>

            <Separator />

            {/* Nav links */}
            <nav className="flex-1 px-3 py-4 space-y-1">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                isActive ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                            }`}
                        >
                            <item.icon className="h-4 w-4" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <Separator />

            {/* User info */}
            <div className="px-4 py-4 flex items-center gap-3">
                <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{session.tenant.name}</p>
                    <Badge variant={session.role === 'admin' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                        {session.role}
                    </Badge>
                </div>
                <form action={logoutAction}>
                    <Button
                        type="submit"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                        title="Log out"
                    >
                        <LogOut className="h-4 w-4" />
                    </Button>
                </form>
            </div>
        </aside>
    );
}
