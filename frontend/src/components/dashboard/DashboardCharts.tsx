'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/lib/hooks/useSession';
import { getDashboardStats } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import type { DashboardStats } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = {
    draft: '#94a3b8',
    active: '#3b82f6',
    matching: '#f59e0b',
    completed: '#22c55e',
    archived: '#6b7280',
    pending: '#94a3b8',
    in_pool: '#3b82f6',
    matched: '#22c55e',
    opted_out: '#ef4444',
    confirmed: '#22c55e',
    rejected: '#ef4444',
    expired: '#6b7280',
};

const SCORE_COLORS = ['#ef4444', '#f59e0b', '#eab308', '#84cc16', '#22c55e'];

export function DashboardCharts() {
    const { apiKey } = useSession();

    const { data: stats, isLoading } = useQuery<DashboardStats>({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const res = await getDashboardStats(apiKey);
            return res.data;
        },
        enabled: Boolean(apiKey),
    });

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-72 rounded-xl" />
                ))}
            </div>
        );
    }

    if (!stats) return null;

    // Events by status for pie chart
    const eventStatusData = Object.entries(stats.eventsByStatus).map(([name, value]) => ({ name, value }));

    // Attendees by status for pie chart
    const attendeeStatusData = Object.entries(stats.attendeesByStatus).map(([name, value]) => ({ name, value }));

    // Match score distribution
    const scoreData = Object.entries(stats.scoreDistribution).map(([range, count]) => ({ range, count }));

    // Attendees over time
    const attendeesTimeline = Object.entries(stats.attendeesOverTime)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({
            date: new Date(date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
            }),
            count,
        }));

    // Matches by status for pie
    const matchStatusData = Object.entries(stats.matchesByStatus).map(([name, value]) => ({ name, value }));

    return (
        <div className="space-y-6">
            {/* Charts grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Event Status Distribution */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Events by Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {eventStatusData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={eventStatusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={3}
                                        dataKey="value"
                                        label={({ name, value }) => `${name} (${value})`}
                                        labelLine={false}
                                    >
                                        {eventStatusData.map((entry) => (
                                            <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? '#8884d8'} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">No events yet</div>
                        )}
                    </CardContent>
                </Card>

                {/* Match Score Distribution */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Match Score Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {scoreData.some((d) => d.count > 0) ? (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={scoreData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                        {scoreData.map((_, idx) => (
                                            <Cell key={idx} fill={SCORE_COLORS[idx % SCORE_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">No matches yet</div>
                        )}
                    </CardContent>
                </Card>

                {/* Attendee Growth */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Attendee Registrations (30d)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {attendeesTimeline.length > 0 ? (
                            <ResponsiveContainer width="100%" height={220}>
                                <AreaChart data={attendeesTimeline}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="count" stroke="#f97316" strokeWidth={2} fill="url(#colorCount)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                                No data in the last 30 days
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Match Status */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Matches by Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {matchStatusData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={matchStatusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={3}
                                        dataKey="value"
                                        label={({ name, value }) => `${name} (${value})`}
                                        labelLine={false}
                                    >
                                        {matchStatusData.map((entry) => (
                                            <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? '#8884d8'} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">No matches yet</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Recent Jobs */}
            {stats.recentJobs.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Recent Matching Jobs</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {stats.recentJobs.map((job) => {
                                const summary = job.resultSummary as {
                                    matchesFound?: number;
                                    totalAttendees?: number;
                                    elapsedMs?: number;
                                } | null;
                                return (
                                    <div key={job.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`inline-block h-2 w-2 rounded-full ${
                                                        job.status === 'completed'
                                                            ? 'bg-green-500'
                                                            : job.status === 'failed'
                                                            ? 'bg-red-500'
                                                            : job.status === 'processing'
                                                            ? 'bg-yellow-500'
                                                            : 'bg-gray-400'
                                                    }`}
                                                />
                                                <p className="text-sm font-medium capitalize">{job.status}</p>
                                            </div>
                                            {summary && (
                                                <p className="text-xs text-muted-foreground ml-4">
                                                    {summary.matchesFound ?? 0} matches • {summary.totalAttendees ?? 0} attendees •{' '}
                                                    {summary.elapsedMs ?? 0}ms
                                                </p>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground shrink-0">{new Date(job.createdAt).toLocaleString()}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
