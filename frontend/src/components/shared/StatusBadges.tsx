import { Badge } from '@/components/ui/badge';
import type { EventStatus, AttendeeStatus, MatchStatus, JobStatus } from '@/lib/types';

const EVENT_STATUS_MAP: Record<EventStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    draft: { label: 'Draft', variant: 'secondary' },
    active: { label: 'Active', variant: 'default' },
    matching: { label: 'Matching', variant: 'default' },
    completed: { label: 'Completed', variant: 'outline' },
    archived: { label: 'Archived', variant: 'secondary' },
};

export function EventStatusBadge({ status }: { status: EventStatus }) {
    const cfg = EVENT_STATUS_MAP[status] ?? { label: status, variant: 'secondary' as const };
    return (
        <Badge
            variant={cfg.variant}
            className={
                status === 'active' || status === 'matching'
                    ? 'bg-green-100 text-green-700 hover:bg-green-100'
                    : status === 'completed'
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-100'
                    : ''
            }
        >
            {cfg.label}
        </Badge>
    );
}

const ATTENDEE_STATUS_MAP: Record<AttendeeStatus, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100' },
    in_pool: { label: 'In Pool', className: 'bg-green-100 text-green-700 hover:bg-green-100' },
    matched: { label: 'Matched', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
    opted_out: { label: 'Opted Out', className: 'bg-gray-100 text-gray-600 hover:bg-gray-100' },
};

export function AttendeeStatusBadge({ status }: { status: AttendeeStatus }) {
    const cfg = ATTENDEE_STATUS_MAP[status] ?? { label: status, className: '' };
    return (
        <Badge variant="outline" className={cfg.className}>
            {cfg.label}
        </Badge>
    );
}

const MATCH_STATUS_MAP: Record<MatchStatus, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100' },
    confirmed: { label: 'Confirmed', className: 'bg-green-100 text-green-700 hover:bg-green-100' },
    rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700 hover:bg-red-100' },
    expired: { label: 'Expired', className: 'bg-gray-100 text-gray-600 hover:bg-gray-100' },
};

export function MatchStatusBadge({ status }: { status: MatchStatus }) {
    const cfg = MATCH_STATUS_MAP[status] ?? { label: status, className: '' };
    return (
        <Badge variant="outline" className={cfg.className}>
            {cfg.label}
        </Badge>
    );
}

const JOB_STATUS_MAP: Record<JobStatus, { label: string; className: string; dot: string }> = {
    queued: {
        label: 'Queued',
        className: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
        dot: 'bg-gray-500',
    },
    processing: {
        label: 'Processing',
        className: 'bg-green-100 text-green-700 hover:bg-green-100',
        dot: 'bg-green-500 animate-pulse',
    },
    completed: {
        label: 'Completed',
        className: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
        dot: 'bg-blue-500',
    },
    failed: {
        label: 'Failed',
        className: 'bg-red-100 text-red-700 hover:bg-red-100',
        dot: 'bg-red-500',
    },
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
    const cfg = JOB_STATUS_MAP[status] ?? {
        label: status,
        className: '',
        dot: 'bg-gray-400',
    };
    return (
        <Badge variant="outline" className={`gap-1.5 ${cfg.className}`}>
            <span className={`inline-block h-2 w-2 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </Badge>
    );
}
