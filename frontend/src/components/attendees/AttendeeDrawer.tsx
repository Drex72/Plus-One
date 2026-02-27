'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { AttendeeStatusBadge } from '@/components/shared/StatusBadges';
import { User, Mail, Hash, Calendar, Fingerprint, Heart, UserCircle, SlidersHorizontal } from 'lucide-react';
import type { Attendee } from '@/lib/types';

/* ── Reusable outlined section ── */
function Section({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-lg border">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/40">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">{title}</h4>
            </div>
            <div className="px-4 py-3">{children}</div>
        </div>
    );
}

export function AttendeeDrawer({ attendee, open, onClose }: { attendee: Attendee | null; open: boolean; onClose: () => void }) {
    if (!attendee) return null;

    const profileEntries = Object.entries(attendee.attributes ?? {});

    return (
        <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto px-0">
                <SheetHeader className="px-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <User className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <SheetTitle className="capitalize truncate">{attendee.name}</SheetTitle>
                            <SheetDescription className="truncate">{attendee.email || 'No email provided'}</SheetDescription>
                        </div>
                        <AttendeeStatusBadge status={attendee.status} />
                    </div>
                </SheetHeader>

                <div className="space-y-4 mt-2 px-6">
                    {/* Quick info cards */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5">
                            <Mail className="h-4 w-4 text-primary shrink-0" />
                            <div className="min-w-0">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Email</p>
                                <p className="text-sm truncate">{attendee.email || '—'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5">
                            <Calendar className="h-4 w-4 text-primary shrink-0" />
                            <div className="min-w-0">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Registered</p>
                                <p className="text-sm truncate">{new Date(attendee.createdAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                        {attendee.externalId && (
                            <div className="col-span-2 flex items-center gap-2.5 rounded-lg border px-3 py-2.5">
                                <Fingerprint className="h-4 w-4 text-primary shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">External ID</p>
                                    <p className="text-sm truncate font-mono">{attendee.externalId}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Profile section */}
                    {profileEntries.length > 0 && (
                        <Section icon={UserCircle} title="Profile">
                            <div className="space-y-0 divide-y">
                                {profileEntries.map(([key, value]) => (
                                    <div key={key} className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                                        <p className="text-sm font-medium capitalize text-muted-foreground shrink-0">{key.replace(/_/g, ' ')}</p>
                                        <div className="text-right min-w-0">
                                            {Array.isArray(value) ? (
                                                <div className="flex flex-wrap gap-1 justify-end">
                                                    {(value as string[]).map((v) => (
                                                        <Badge key={v} variant="secondary" className="text-xs capitalize">
                                                            {String(v)}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm capitalize truncate">{String(value)}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}

                    {profileEntries.length === 0 && (
                        <Section icon={UserCircle} title="Profile">
                            <p className="text-sm text-muted-foreground">No profile attributes set.</p>
                        </Section>
                    )}

                    {/* Preferences section */}
                    <Section icon={Heart} title="Preferences">
                        {attendee.preferences && attendee.preferences.length > 0 ? (
                            <div className="space-y-0 divide-y">
                                {attendee.preferences.map((pref, i) => (
                                    <div key={i} className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                                        <div className="flex items-center gap-2 shrink-0">
                                            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                                            <span className="text-sm font-medium capitalize">{pref.field.replace(/_/g, ' ')}</span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5 justify-end min-w-0">
                                            <Badge variant="outline" className="text-[10px] shrink-0">
                                                {pref.type}
                                            </Badge>
                                            {Array.isArray(pref.value) ? (
                                                (pref.value as string[]).map((v, vi) => (
                                                    <Badge key={vi} variant="secondary" className="text-xs capitalize">
                                                        {String(v)}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <span className="text-sm text-muted-foreground truncate max-w-[140px]">
                                                    {JSON.stringify(pref.value)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No preferences set.</p>
                        )}
                    </Section>

                    {/* Metadata footer */}
                    <div className="rounded-lg border bg-muted/30 px-4 py-3 space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Hash className="h-3 w-3 shrink-0" />
                            <span className="truncate font-mono">{attendee.id}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3 shrink-0" />
                            <span>Updated {new Date(attendee.updatedAt).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
