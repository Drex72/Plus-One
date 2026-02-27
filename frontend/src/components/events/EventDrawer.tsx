'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EventStatusBadge } from '@/components/shared/StatusBadges';
import { MatchingEngineCard } from '@/components/matching/MatchingEngineCard';
import { AIConfigExplainer } from '@/components/ai/AIConfigExplainer';
import { JobHistoryDrawer } from './JobHistoryDrawer';
import { PoolHealthCard } from './PoolHealthCard';
import { saveTemplate } from '@/lib/templates';
import { useSession } from '@/lib/hooks/useSession';
import { Pencil, Loader2, Rocket, Archive, CheckCircle, X, Plus, Trash2, GripVertical, AlertCircle, Copy, History, BookmarkPlus } from 'lucide-react';
import { toast } from 'sonner';
import type { Event, EventStatus, AttributeConfig, ConstraintRule, UpdateEventPayload } from '@/lib/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1';

// ── Form-level types (mirror CreateEventDrawer) ─────────

type AttributeType = 'array_similarity' | 'ordinal' | 'exact' | 'numeric';
type ConstraintOperator = 'eq' | 'neq' | 'in' | 'not_in' | 'range' | 'gte' | 'lte';

interface FormAttribute {
    id: string;
    field: string;
    type: AttributeType;
    weight: number;
    scale: string;
    maxDistance: string;
}

interface FormConstraint {
    id: string;
    field: string;
    operator: ConstraintOperator;
    value: string;
    type: 'hard' | 'soft';
}

function genId() {
    return Math.random().toString(36).slice(2, 9);
}

const ATTRIBUTE_TYPES: {
    value: AttributeType;
    label: string;
}[] = [
    { value: 'array_similarity', label: 'Array Similarity' },
    { value: 'ordinal', label: 'Ordinal' },
    { value: 'exact', label: 'Exact Match' },
    { value: 'numeric', label: 'Numeric' },
];

const CONSTRAINT_OPERATORS: {
    value: ConstraintOperator;
    label: string;
}[] = [
    { value: 'eq', label: 'Equals' },
    { value: 'neq', label: 'Not Equals' },
    { value: 'in', label: 'In' },
    { value: 'not_in', label: 'Not In' },
    { value: 'range', label: 'Range' },
    { value: 'gte', label: '>=' },
    { value: 'lte', label: '<=' },
];

// ── Helpers ─────────────────────────────────────────────

function attrToForm(a: AttributeConfig): FormAttribute {
    return {
        id: genId(),
        field: a.field,
        type: a.type,
        weight: a.weight,
        scale: a.config?.scale?.join(', ') ?? '',
        maxDistance: a.config?.maxDistance != null ? String(a.config.maxDistance) : '',
    };
}

function constraintToForm(c: ConstraintRule): FormConstraint {
    let value = '';
    if (Array.isArray(c.value)) value = JSON.stringify(c.value);
    else if (c.value != null) value = String(c.value);
    return {
        id: genId(),
        field: c.field,
        operator: c.operator,
        value,
        type: c.type,
    };
}

function parseConstraintValue(value: string, operator: ConstraintOperator): unknown {
    const trimmed = value.trim();
    if (operator === 'in' || operator === 'not_in') {
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) return parsed;
        } catch {
            return trimmed.split(',').map((s) => s.trim());
        }
    }
    if (operator === 'range') {
        try {
            return JSON.parse(trimmed);
        } catch {
            return trimmed;
        }
    }
    const num = Number(trimmed);
    if (!isNaN(num) && trimmed !== '') return num;
    return trimmed;
}

// ═════════════════════════════════════════════════════════

export function EventDrawer({ event, open, onClose }: { event: Event | null; open: boolean; onClose: () => void }) {
    const { apiKey } = useSession();
    const router = useRouter();

    // ── Edit-mode state ───────────────────────────────────
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editStartsAt, setEditStartsAt] = useState('');
    const [editEndsAt, setEditEndsAt] = useState('');
    const [editThreshold, setEditThreshold] = useState('60');
    const [editRequiredFields, setEditRequiredFields] = useState<string[]>([]);
    const [editNewField, setEditNewField] = useState('');
    const [editAttributes, setEditAttributes] = useState<FormAttribute[]>([]);
    const [editConstraints, setEditConstraints] = useState<FormConstraint[]>([]);
    const [editErrors, setEditErrors] = useState<Record<string, string>>({});
    const [jobHistoryOpen, setJobHistoryOpen] = useState(false);

    // ── Mutations (must be before early return) ───────────

    const updateMutation = useMutation({
        mutationFn: async (body: UpdateEventPayload) => {
            if (!event) return;
            const res = await fetch(`${BASE_URL}/events/${event.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message ?? `Failed: ${res.status}`);
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success('Event updated');
            setEditing(false);
            router.refresh();
        },
        onError: (err: Error) => {
            toast.error('Update failed', { description: err.message });
        },
    });

    const statusMutation = useMutation({
        mutationFn: async (status: EventStatus) => {
            if (!event) return;
            const res = await fetch(`${BASE_URL}/events/${event.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
                body: JSON.stringify({ status }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message ?? `Failed: ${res.status}`);
            }
            return res.json();
        },
        onSuccess: (_data, status) => {
            toast.success(
                status === 'active'
                    ? 'Event published!'
                    : status === 'completed'
                    ? 'Event marked as completed'
                    : status === 'archived'
                    ? 'Event archived'
                    : 'Status updated',
            );
            router.refresh();
            onClose();
        },
        onError: (err: Error) => {
            toast.error('Failed to update status', { description: err.message });
        },
    });

    const duplicateMutation = useMutation({
        mutationFn: async () => {
            if (!event) return;
            const body = {
                name: `${event.name} (Copy)`,
                description: event.description ?? '',
                startsAt: event.startsAt,
                endsAt: event.endsAt,
                matchingConfig: event.matchingConfig ?? undefined,
            };
            const res = await fetch(`${BASE_URL}/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message ?? `Failed: ${res.status}`);
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success('Event duplicated!');
            router.refresh();
            onClose();
        },
        onError: (err: Error) => toast.error('Duplicate failed', { description: err.message }),
    });

    // ── Early return (after hooks) ────────────────────────
    if (!event) return null;

    const config = event.matchingConfig;
    const viewAttributes = config?.attributes ?? [];
    const viewConstraints = config?.constraints ?? [];
    const viewRequiredFields = config?.requiredFields ?? [];

    // ── Enter / leave edit mode ───────────────────────────

    const startEditing = () => {
        setEditName(event.name);
        setEditDescription(event.description ?? '');
        setEditStartsAt(event.startsAt ? new Date(event.startsAt).toISOString().slice(0, 16) : '');
        setEditEndsAt(event.endsAt ? new Date(event.endsAt).toISOString().slice(0, 16) : '');
        setEditThreshold(String(config?.matchThreshold ?? 60));
        setEditRequiredFields([...(config?.requiredFields ?? [])]);
        setEditAttributes((config?.attributes ?? []).map(attrToForm));
        setEditConstraints((config?.constraints ?? []).map(constraintToForm));
        setEditErrors({});
        setEditing(true);
    };

    const cancelEditing = () => {
        setEditing(false);
        setEditErrors({});
    };

    // ── Required-field helpers ────────────────────────────

    const addRequiredField = () => {
        const field = editNewField.trim().toLowerCase().replace(/\s+/g, '_');
        if (!field) return;
        if (editRequiredFields.includes(field)) {
            setEditErrors((e) => ({ ...e, newField: 'Field already exists' }));
            return;
        }
        setEditRequiredFields((f) => [...f, field]);
        setEditNewField('');
        setEditErrors((e) => {
            const { newField: _, ...rest } = e;
            return rest;
        });
    };

    const removeRequiredField = (field: string) => {
        setEditRequiredFields((f) => f.filter((x) => x !== field));
        setEditAttributes((a) => a.filter((x) => x.field !== field));
        setEditConstraints((c) => c.filter((x) => x.field !== field));
    };

    // ── Attribute helpers ─────────────────────────────────

    const addAttribute = () =>
        setEditAttributes((a) => [...a, { id: genId(), field: '', type: 'array_similarity', weight: 0.5, scale: '', maxDistance: '' }]);

    const updateAttribute = (id: string, u: Partial<FormAttribute>) => setEditAttributes((a) => a.map((x) => (x.id === id ? { ...x, ...u } : x)));

    const removeAttribute = (id: string) => setEditAttributes((a) => a.filter((x) => x.id !== id));

    // ── Constraint helpers ────────────────────────────────

    const addConstraint = () =>
        setEditConstraints((c) => [...c, { id: genId(), field: '', operator: 'eq' as ConstraintOperator, value: '', type: 'hard' as const }]);

    const updateConstraint = (id: string, u: Partial<FormConstraint>) => setEditConstraints((c) => c.map((x) => (x.id === id ? { ...x, ...u } : x)));

    const removeConstraint = (id: string) => setEditConstraints((c) => c.filter((x) => x.id !== id));

    // ── Save ──────────────────────────────────────────────

    const handleSave = () => {
        const errs: Record<string, string> = {};
        if (!editName.trim()) errs.name = 'Name is required';

        editAttributes.forEach((attr, i) => {
            if (!attr.field) errs[`attr_${i}_field`] = 'Select a field';
            if (attr.type === 'ordinal' && !attr.scale.trim()) errs[`attr_${i}_scale`] = 'Scale required';
            if (attr.type === 'numeric' && !attr.maxDistance.trim()) errs[`attr_${i}_maxDistance`] = 'Max distance required';
        });

        const totalW = editAttributes.reduce((s, a) => s + a.weight, 0);
        if (editAttributes.length > 0 && (totalW < 0.95 || totalW > 1.05))
            errs.weights = `Weights should sum to 1.0 (currently ${totalW.toFixed(2)})`;

        editConstraints.forEach((c, i) => {
            if (!c.field) errs[`con_${i}_field`] = 'Select a field';
            if (!c.value.trim()) errs[`con_${i}_value`] = 'Value required';
        });

        setEditErrors(errs);
        if (Object.keys(errs).length > 0) return;

        const hasConfig = editRequiredFields.length > 0 || editAttributes.length > 0;

        const payload: UpdateEventPayload = {
            name: editName.trim(),
            description: editDescription.trim() || null,
            startsAt: editStartsAt ? new Date(editStartsAt).toISOString() : null,
            endsAt: editEndsAt ? new Date(editEndsAt).toISOString() : null,
        };

        if (hasConfig) {
            payload.matchingConfig = {
                matchThreshold: Number(editThreshold),
                requiredFields: editRequiredFields,
                attributes: editAttributes.map((a): AttributeConfig => {
                    const attr: AttributeConfig = {
                        field: a.field,
                        type: a.type,
                        weight: a.weight,
                    };
                    if (a.type === 'ordinal' && a.scale) attr.config = { scale: a.scale.split(',').map((s) => s.trim()) };
                    if (a.type === 'numeric' && a.maxDistance) attr.config = { maxDistance: Number(a.maxDistance) };
                    return attr;
                }),
                constraints: editConstraints.map(
                    (c): ConstraintRule => ({
                        field: c.field,
                        operator: c.operator,
                        value: parseConstraintValue(c.value, c.operator),
                        type: c.type,
                    }),
                ),
            };
        }

        updateMutation.mutate(payload);
    };

    const isBusy = updateMutation.isPending || statusMutation.isPending;

    // ═════════════════════════════════════════════════════
    // RENDER
    // ═════════════════════════════════════════════════════

    return (
        <>
            <Sheet
                open={open}
                onOpenChange={(v) => {
                    if (!v) {
                        setEditing(false);
                        onClose();
                    }
                }}
            >
                <SheetContent className="w-full sm:max-w-xl overflow-y-auto px-0">
                    <SheetHeader className="px-6">
                        {editing ? (
                            <div className="flex items-start justify-between pr-8">
                                <div>
                                    <SheetTitle>Edit Event</SheetTitle>
                                    <SheetDescription>Update details & matching configuration.</SheetDescription>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={cancelEditing} disabled={isBusy}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <div className="flex items-start justify-between pr-8">
                                <div className="min-w-0">
                                    <SheetTitle className="capitalize truncate">{event.name}</SheetTitle>
                                    <SheetDescription className="truncate">{event.description || 'No description provided.'}</SheetDescription>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={startEditing}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </SheetHeader>

                    {/* ═══ EDIT MODE ═══ */}
                    {editing ? (
                        <div className="space-y-6 mt-2 px-6 pb-6">
                            {/* ── Basic info ── */}
                            <section className="space-y-3">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Event Details</h4>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">
                                        Name <span className="text-red-500">*</span>
                                    </Label>
                                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                                    {editErrors.name && <p className="text-xs text-red-600">{editErrors.name}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Description</Label>
                                    <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={2} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Starts At</Label>
                                        <Input type="datetime-local" value={editStartsAt} onChange={(e) => setEditStartsAt(e.target.value)} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Ends At</Label>
                                        <Input type="datetime-local" value={editEndsAt} onChange={(e) => setEditEndsAt(e.target.value)} />
                                    </div>
                                </div>
                            </section>

                            <Separator />

                            {/* ── Threshold ── */}
                            <section className="space-y-3">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Matching Configuration</h4>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Match Threshold (%)</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={editThreshold}
                                        onChange={(e) => setEditThreshold(e.target.value)}
                                        className="w-28"
                                    />
                                </div>
                            </section>

                            <Separator />

                            {/* ── Required fields ── */}
                            <section className="space-y-3">
                                <div>
                                    <Label className="text-xs">Required Fields</Label>
                                    <p className="text-[11px] text-muted-foreground">
                                        Profile fields attendees must have. Attributes & constraints reference these.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {editRequiredFields.map((f) => (
                                        <Badge key={f} variant="secondary" className="gap-1 capitalize pr-1">
                                            {f.replace(/_/g, ' ')}
                                            <button
                                                type="button"
                                                onClick={() => removeRequiredField(f)}
                                                className="ml-0.5 hover:bg-muted rounded-sm p-0.5"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        value={editNewField}
                                        onChange={(e) => setEditNewField(e.target.value)}
                                        placeholder="e.g. interests, experience_level"
                                        className="flex-1"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                addRequiredField();
                                            }
                                        }}
                                    />
                                    <Button type="button" variant="outline" size="sm" onClick={addRequiredField}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                                {editErrors.newField && <p className="text-xs text-red-600">{editErrors.newField}</p>}
                            </section>

                            <Separator />

                            {/* ── Attributes ── */}
                            <section className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="text-xs">Attributes</Label>
                                        <p className="text-[11px] text-muted-foreground">How each field is scored. Weights should sum to 1.0.</p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={addAttribute}
                                        disabled={editRequiredFields.length === 0}
                                        className="gap-1"
                                    >
                                        <Plus className="h-3.5 w-3.5" /> Add
                                    </Button>
                                </div>

                                {editErrors.attributes && <p className="text-xs text-red-600">{editErrors.attributes}</p>}
                                {editErrors.weights && (
                                    <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                        {editErrors.weights}
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {editAttributes.map((attr, i) => (
                                        <div key={attr.id} className="bg-muted/50 rounded-lg p-3 space-y-3 border border-border/50">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                                                    <span className="text-xs font-medium text-muted-foreground">Attribute {i + 1}</span>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => removeAttribute(attr.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                                                </Button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs">Field</Label>
                                                    <Select value={attr.field} onValueChange={(v) => updateAttribute(attr.id, { field: v })}>
                                                        <SelectTrigger className="h-9">
                                                            <SelectValue placeholder="Select field" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {editRequiredFields.map((f) => (
                                                                <SelectItem key={f} value={f}>
                                                                    <span className="capitalize">{f.replace(/_/g, ' ')}</span>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {editErrors[`attr_${i}_field`] && (
                                                        <p className="text-xs text-red-600">{editErrors[`attr_${i}_field`]}</p>
                                                    )}
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs">Type</Label>
                                                    <Select
                                                        value={attr.type}
                                                        onValueChange={(v) =>
                                                            updateAttribute(attr.id, {
                                                                type: v as AttributeType,
                                                            })
                                                        }
                                                    >
                                                        <SelectTrigger className="h-9">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {ATTRIBUTE_TYPES.map((t) => (
                                                                <SelectItem key={t.value} value={t.value}>
                                                                    {t.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            {/* Weight slider */}
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-xs">Weight</Label>
                                                    <span className="text-xs text-muted-foreground">{Math.round(attr.weight * 100)}%</span>
                                                </div>
                                                <Input
                                                    type="range"
                                                    min={0}
                                                    max={1}
                                                    step={0.05}
                                                    value={attr.weight}
                                                    onChange={(e) =>
                                                        updateAttribute(attr.id, {
                                                            weight: Number(e.target.value),
                                                        })
                                                    }
                                                    className="h-2 cursor-pointer accent-primary"
                                                />
                                            </div>

                                            {attr.type === 'ordinal' && (
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs">Scale (comma-separated, low → high)</Label>
                                                    <Input
                                                        value={attr.scale}
                                                        onChange={(e) => updateAttribute(attr.id, { scale: e.target.value })}
                                                        placeholder="e.g. junior, mid, senior, lead"
                                                        className="h-9"
                                                    />
                                                    {editErrors[`attr_${i}_scale`] && (
                                                        <p className="text-xs text-red-600">{editErrors[`attr_${i}_scale`]}</p>
                                                    )}
                                                </div>
                                            )}

                                            {attr.type === 'numeric' && (
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs">Max Distance</Label>
                                                    <Input
                                                        type="number"
                                                        value={attr.maxDistance}
                                                        onChange={(e) =>
                                                            updateAttribute(attr.id, {
                                                                maxDistance: e.target.value,
                                                            })
                                                        }
                                                        placeholder="e.g. 10"
                                                        className="h-9 w-28"
                                                    />
                                                    {editErrors[`attr_${i}_maxDistance`] && (
                                                        <p className="text-xs text-red-600">{editErrors[`attr_${i}_maxDistance`]}</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <Separator />

                            {/* ── Constraints ── */}
                            <section className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="text-xs">Constraints</Label>
                                        <p className="text-[11px] text-muted-foreground">Optional rules to filter or penalize matches.</p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={addConstraint}
                                        disabled={editRequiredFields.length === 0}
                                        className="gap-1"
                                    >
                                        <Plus className="h-3.5 w-3.5" /> Add
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    {editConstraints.map((con, i) => (
                                        <div key={con.id} className="bg-muted/50 rounded-lg p-3 space-y-3 border border-border/50">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs font-medium text-muted-foreground">Constraint {i + 1}</span>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => removeConstraint(con.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                                                </Button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs">Field</Label>
                                                    <Select value={con.field} onValueChange={(v) => updateConstraint(con.id, { field: v })}>
                                                        <SelectTrigger className="h-9">
                                                            <SelectValue placeholder="Select field" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {editRequiredFields.map((f) => (
                                                                <SelectItem key={f} value={f}>
                                                                    <span className="capitalize">{f.replace(/_/g, ' ')}</span>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {editErrors[`con_${i}_field`] && (
                                                        <p className="text-xs text-red-600">{editErrors[`con_${i}_field`]}</p>
                                                    )}
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs">Operator</Label>
                                                    <Select
                                                        value={con.operator}
                                                        onValueChange={(v) =>
                                                            updateConstraint(con.id, {
                                                                operator: v as ConstraintOperator,
                                                            })
                                                        }
                                                    >
                                                        <SelectTrigger className="h-9">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {CONSTRAINT_OPERATORS.map((op) => (
                                                                <SelectItem key={op.value} value={op.value}>
                                                                    {op.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs">Value</Label>
                                                    <Input
                                                        value={con.value}
                                                        onChange={(e) => updateConstraint(con.id, { value: e.target.value })}
                                                        placeholder='e.g. "vip" or ["a","b"]'
                                                        className="h-9"
                                                    />
                                                    {editErrors[`con_${i}_value`] && (
                                                        <p className="text-xs text-red-600">{editErrors[`con_${i}_value`]}</p>
                                                    )}
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs">Enforcement</Label>
                                                    <Select
                                                        value={con.type}
                                                        onValueChange={(v) =>
                                                            updateConstraint(con.id, {
                                                                type: v as 'hard' | 'soft',
                                                            })
                                                        }
                                                    >
                                                        <SelectTrigger className="h-9">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="hard">Hard (strict)</SelectItem>
                                                            <SelectItem value="soft">Soft (penalize)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <Separator />

                            {/* ── Save / cancel bar ── */}
                            <div className="flex items-center gap-2 pt-2">
                                <Button onClick={handleSave} disabled={isBusy || !editName.trim()} className="gap-1.5">
                                    {updateMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    Save Changes
                                </Button>
                                <Button variant="ghost" onClick={cancelEditing} disabled={isBusy}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        /* ═══ VIEW MODE ═══ */
                        <div className="space-y-6 mt-2 px-6">
                            {/* Status & dates */}
                            <div className="flex items-center gap-3 flex-wrap">
                                <EventStatusBadge status={event.status} />
                                {event.startsAt && (
                                    <span className="text-sm text-muted-foreground">
                                        {new Date(event.startsAt).toLocaleDateString()} –{' '}
                                        {event.endsAt ? new Date(event.endsAt).toLocaleDateString() : 'TBD'}
                                    </span>
                                )}
                            </div>

                            {/* Status actions */}
                            <div className="flex gap-2 flex-wrap">
                                {event.status === 'draft' && (
                                    <Button size="sm" onClick={() => statusMutation.mutate('active')} disabled={isBusy} className="gap-1.5">
                                        {statusMutation.isPending ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Rocket className="h-3.5 w-3.5" />
                                        )}
                                        Publish Event
                                    </Button>
                                )}
                                {event.status === 'active' && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => statusMutation.mutate('completed')}
                                        disabled={isBusy}
                                        className="gap-1.5"
                                    >
                                        <CheckCircle className="h-3.5 w-3.5" />
                                        Mark Completed
                                    </Button>
                                )}
                                {event.status === 'matching' && (
                                    <p className="text-xs text-amber-600 self-center">Stop matching from the engine below to change event status.</p>
                                )}
                                {(event.status === 'completed' || event.status === 'active') && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => statusMutation.mutate('archived')}
                                        disabled={isBusy}
                                        className="gap-1.5"
                                    >
                                        <Archive className="h-3.5 w-3.5" />
                                        Archive
                                    </Button>
                                )}

                                {/* Duplicate & Job History */}
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => duplicateMutation.mutate()}
                                    disabled={duplicateMutation.isPending}
                                    className="gap-1.5"
                                >
                                    {duplicateMutation.isPending ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Copy className="h-3.5 w-3.5" />
                                    )}
                                    Duplicate
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setJobHistoryOpen(true)} className="gap-1.5">
                                    <History className="h-3.5 w-3.5" />
                                    Job History
                                </Button>
                                {config && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            saveTemplate({
                                                name: event.name + ' Template',
                                                matchThreshold: config.matchThreshold ?? 60,
                                                requiredFields: config.requiredFields ?? [],
                                                attributes: config.attributes ?? [],
                                                constraints: config.constraints ?? [],
                                            });
                                            toast.success('Template saved!', {
                                                description: 'You can use it when creating new events.',
                                            });
                                        }}
                                        className="gap-1.5"
                                    >
                                        <BookmarkPlus className="h-3.5 w-3.5" />
                                        Save Template
                                    </Button>
                                )}
                            </div>

                            <Separator />

                            {/* Matching Config */}
                            {config ? (
                                <div className="space-y-3">
                                    <h4 className="text-sm font-semibold">Matching Configuration</h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">Threshold</p>
                                            <p className="font-medium">{config.matchThreshold ?? 'Default'}%</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Required Fields</p>
                                            <p className="font-medium">{viewRequiredFields.length}</p>
                                        </div>
                                    </div>

                                    {viewRequiredFields.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {viewRequiredFields.map((f) => (
                                                <Badge key={f} variant="secondary" className="text-xs capitalize">
                                                    {f.replace(/_/g, ' ')}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}

                                    {viewAttributes.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Attributes</p>
                                            {viewAttributes.map((attr) => (
                                                <div key={attr.field} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium capitalize truncate">{attr.field.replace(/_/g, ' ')}</p>
                                                        <p className="text-xs text-muted-foreground capitalize">{attr.type.replace(/_/g, ' ')}</p>
                                                    </div>
                                                    <Badge variant="outline" className="text-xs">
                                                        {Math.round(attr.weight * 100)}%
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {viewConstraints.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Constraints</p>
                                            {viewConstraints.map((c, i) => (
                                                <div key={i} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 text-sm">
                                                    <span className="truncate capitalize">
                                                        {c.field.replace(/_/g, ' ')} {c.operator} {JSON.stringify(c.value)}
                                                    </span>
                                                    <Badge variant={c.type === 'hard' ? 'destructive' : 'secondary'} className="text-xs">
                                                        {c.type}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-muted/50 rounded-lg p-4 text-center">
                                    <p className="text-sm text-muted-foreground">No matching configuration set.</p>
                                </div>
                            )}

                            {/* AI Matching Insights */}
                            {config && (config.attributes?.length > 0 || config.constraints?.length > 0) && (
                                <>
                                    <Separator />
                                    <AIConfigExplainer config={config} />
                                </>
                            )}

                            <Separator />

                            {/* Pool Health */}
                            {config && (
                                <PoolHealthCard
                                    eventId={event.id}
                                    requiredFields={viewRequiredFields}
                                    attributeNames={viewAttributes.map((a: AttributeConfig) => a.field)}
                                />
                            )}

                            {/* Matching Engine */}
                            {(event.status === 'active' || event.status === 'matching' || event.status === 'completed') && (
                                <MatchingEngineCard eventId={event.id} eventStatus={event.status} onMatchingComplete={() => router.refresh()} />
                            )}

                            {/* Metadata */}
                            <div className="text-xs text-muted-foreground space-y-1">
                                <p>Event ID: {event.id}</p>
                                <p>Created: {new Date(event.createdAt).toLocaleString()}</p>
                                <p>Updated: {new Date(event.updatedAt).toLocaleString()}</p>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
            <JobHistoryDrawer eventId={event.id} open={jobHistoryOpen} onClose={() => setJobHistoryOpen(false)} />
        </>
    );
}
