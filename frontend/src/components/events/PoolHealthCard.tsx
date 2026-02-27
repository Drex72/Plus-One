'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useSession } from '@/lib/hooks/useSession';
import { HeartPulse, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { Attendee, ApiResponse } from '@/lib/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1';

interface Props {
    eventId: string;
    requiredFields: string[];
    attributeNames: string[];
}

export function PoolHealthCard({ eventId, requiredFields, attributeNames }: Props) {
    const { apiKey } = useSession();

    const { data: attendees } = useQuery<Attendee[]>({
        queryKey: ['attendees', eventId],
        queryFn: async () => {
            const res = await fetch(`${BASE_URL}/attendees/${eventId}?pageSize=100`, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey,
                },
                cache: 'no-store',
            });
            if (!res.ok) return [];
            const json: ApiResponse<Attendee[]> = await res.json();
            return json.data;
        },
        enabled: Boolean(eventId && apiKey),
    });

    if (!attendees || attendees.length === 0) return null;

    // All fields that matter for matching
    const allFields = Array.from(new Set([...requiredFields, ...attributeNames]));
    if (allFields.length === 0) return null;

    // Compute per-field completeness
    const fieldStats = allFields.map((field) => {
        let complete = 0;
        for (const att of attendees) {
            const val = att.attributes?.[field];
            if (val != null && val !== '' && !(Array.isArray(val) && val.length === 0)) {
                complete++;
            }
        }
        return {
            field,
            complete,
            total: attendees.length,
            pct: Math.round((complete / attendees.length) * 100),
            required: requiredFields.includes(field),
        };
    });

    const overallPct = Math.round(fieldStats.reduce((s, f) => s + f.pct, 0) / fieldStats.length);

    const healthy = overallPct >= 80;

    return (
        <Card className={`${healthy ? 'border-green-200 dark:border-green-800/40' : 'border-yellow-200 dark:border-yellow-800/40'}`}>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <HeartPulse className={`h-4 w-4 ${healthy ? 'text-green-600' : 'text-yellow-600'}`} />
                    Pool Health
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Overall */}
                <div className="flex items-center gap-3">
                    <Progress value={overallPct} className="flex-1 h-2" />
                    <span
                        className={`text-sm font-semibold ${
                            overallPct >= 80 ? 'text-green-600' : overallPct >= 50 ? 'text-yellow-600' : 'text-red-600'
                        }`}
                    >
                        {overallPct}%
                    </span>
                </div>
                <p className="text-xs text-muted-foreground">
                    {attendees.length} attendee{attendees.length !== 1 ? 's' : ''} — attribute completeness across {allFields.length} field
                    {allFields.length !== 1 ? 's' : ''}
                </p>

                {/* Per-field breakdown */}
                <div className="space-y-1.5">
                    {fieldStats.map((stat) => (
                        <div key={stat.field} className="flex items-center gap-2 text-xs">
                            {stat.pct >= 80 ? (
                                <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                            ) : (
                                <AlertTriangle className="h-3 w-3 text-yellow-500 shrink-0" />
                            )}
                            <span className="capitalize flex-1 truncate">
                                {stat.field.replace(/_/g, ' ')}
                                {stat.required && <span className="text-primary ml-1">*</span>}
                            </span>
                            <span className="text-muted-foreground tabular-nums">
                                {stat.complete}/{stat.total}
                            </span>
                            <span
                                className={`font-medium tabular-nums w-8 text-right ${
                                    stat.pct >= 80 ? 'text-green-600' : stat.pct >= 50 ? 'text-yellow-600' : 'text-red-600'
                                }`}
                            >
                                {stat.pct}%
                            </span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
