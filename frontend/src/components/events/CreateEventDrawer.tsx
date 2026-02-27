'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trash2, ChevronRight, ChevronLeft, GripVertical, AlertCircle, Sparkles, Brain, Wand2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '@/lib/hooks/useSession';
import { getTemplates, deleteTemplate, type EventTemplate } from '@/lib/templates';
import type { CreateEventPayload, AttributeConfig, ConstraintRule } from '@/lib/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1';

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

function generateId() {
    return Math.random().toString(36).slice(2, 9);
}

const ATTRIBUTE_TYPES: { value: AttributeType; label: string; description: string }[] = [
    { value: 'array_similarity', label: 'Array Similarity', description: 'Compare arrays of values (e.g. interests, skills)' },
    { value: 'ordinal', label: 'Ordinal', description: 'Ranked/ordered values (e.g. experience level)' },
    { value: 'exact', label: 'Exact Match', description: 'Exact value matching (e.g. department)' },
    { value: 'numeric', label: 'Numeric', description: 'Numeric distance (e.g. age, budget)' },
];

const CONSTRAINT_OPERATORS: { value: ConstraintOperator; label: string }[] = [
    { value: 'eq', label: 'Equals' },
    { value: 'neq', label: 'Not Equals' },
    { value: 'in', label: 'In' },
    { value: 'not_in', label: 'Not In' },
    { value: 'range', label: 'Range' },
    { value: 'gte', label: '>=' },
    { value: 'lte', label: '<=' },
];

export function CreateEventDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const { apiKey } = useSession();
    const router = useRouter();
    const [step, setStep] = useState(1);

    // Step 1: Basic info
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [startsAt, setStartsAt] = useState('');
    const [endsAt, setEndsAt] = useState('');

    // Step 2: Matching config
    const [matchThreshold, setMatchThreshold] = useState('60');
    const [requiredFields, setRequiredFields] = useState<string[]>([]);
    const [newField, setNewField] = useState('');
    const [attributes, setAttributes] = useState<FormAttribute[]>([]);
    const [constraints, setConstraints] = useState<FormConstraint[]>([]);

    // Validation
    const [errors, setErrors] = useState<Record<string, string>>({});

    // AI prompt
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [showAiPrompt, setShowAiPrompt] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [templates, setTemplates] = useState<EventTemplate[]>([]);

    const resetForm = () => {
        setStep(1);
        setName('');
        setDescription('');
        setStartsAt('');
        setEndsAt('');
        setMatchThreshold('60');
        setRequiredFields([]);
        setNewField('');
        setAttributes([]);
        setConstraints([]);
        setErrors({});
        setAiPrompt('');
        setShowAiPrompt(false);
        setShowTemplates(false);
    };

    const loadTemplate = (t: EventTemplate) => {
        setMatchThreshold(String(t.matchThreshold));
        setRequiredFields(t.requiredFields);
        setAttributes(
            t.attributes.map((a) => ({
                id: generateId(),
                field: a.field,
                type: (a.type ?? 'array_similarity') as AttributeType,
                weight: a.weight ?? 0.5,
                scale: (a.config as Record<string, unknown>)?.scale ? ((a.config as Record<string, unknown>).scale as string[]).join(', ') : '',
                maxDistance:
                    (a.config as Record<string, unknown>)?.maxDistance != null ? String((a.config as Record<string, unknown>).maxDistance) : '',
            })),
        );
        setConstraints(
            t.constraints.map((c) => ({
                id: generateId(),
                field: c.field,
                operator: (c.operator ?? 'eq') as ConstraintOperator,
                value: typeof c.value === 'object' ? JSON.stringify(c.value) : String(c.value ?? ''),
                type: (c.type ?? 'hard') as 'hard' | 'soft',
            })),
        );
        setShowTemplates(false);
        setStep(2);
        toast.success(`Loaded template: ${t.name}`);
    };

    const handleShowTemplates = () => {
        setTemplates(getTemplates());
        setShowTemplates(true);
    };

    // ── AI Generation ─────────────────────────────────────
    const handleAiGenerate = async () => {
        if (!aiPrompt.trim()) return;
        setAiLoading(true);
        try {
            const res = await fetch('/api/ai/generate-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: aiPrompt.trim() }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error ?? 'AI generation failed');
            }
            const { data } = await res.json();

            // Populate form from AI response
            if (data.name) setName(data.name);
            if (data.description) setDescription(data.description);
            if (data.matchThreshold) setMatchThreshold(String(data.matchThreshold));

            if (data.requiredFields?.length) {
                setRequiredFields(data.requiredFields);
            }

            if (data.attributes?.length) {
                setAttributes(
                    data.attributes.map(
                        (a: { field: string; type: string; weight: number; config?: { scale?: string[]; maxDistance?: number } }) => ({
                            id: generateId(),
                            field: a.field ?? '',
                            type: (a.type ?? 'array_similarity') as AttributeType,
                            weight: a.weight ?? 0.5,
                            scale: a.config?.scale?.join(', ') ?? '',
                            maxDistance: a.config?.maxDistance != null ? String(a.config.maxDistance) : '',
                        }),
                    ),
                );
            }

            if (data.constraints?.length) {
                setConstraints(
                    data.constraints.map((c: { field: string; operator: string; value: unknown; type: string }) => ({
                        id: generateId(),
                        field: c.field ?? '',
                        operator: (c.operator ?? 'eq') as ConstraintOperator,
                        value: typeof c.value === 'object' ? JSON.stringify(c.value) : String(c.value ?? ''),
                        type: (c.type ?? 'hard') as 'hard' | 'soft',
                    })),
                );
            }

            toast.success('AI generated your event config!', {
                description: 'Review and adjust the details, then proceed.',
            });
            setShowAiPrompt(false);
            setStep(2); // Jump to matching config for review
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'AI generation failed';
            toast.error('AI Error', { description: message });
        } finally {
            setAiLoading(false);
        }
    };

    // ── Required Fields ───────────────────────────────────
    const addRequiredField = () => {
        const field = newField.trim().toLowerCase().replace(/\s+/g, '_');
        if (!field) return;
        if (requiredFields.includes(field)) {
            setErrors((e) => ({ ...e, newField: 'Field already exists' }));
            return;
        }
        setRequiredFields((f) => [...f, field]);
        setNewField('');
        setErrors((e) => {
            const { newField: _, ...rest } = e;
            return rest;
        });
    };

    const removeRequiredField = (field: string) => {
        setRequiredFields((f) => f.filter((x) => x !== field));
        setAttributes((a) => a.filter((x) => x.field !== field));
        setConstraints((c) => c.filter((x) => x.field !== field));
    };

    // ── Attributes ────────────────────────────────────────
    const addAttribute = () => {
        setAttributes((a) => [
            ...a,
            {
                id: generateId(),
                field: '',
                type: 'array_similarity',
                weight: 0.5,
                scale: '',
                maxDistance: '',
            },
        ]);
    };

    const updateAttribute = (id: string, updates: Partial<FormAttribute>) => {
        setAttributes((a) => a.map((attr) => (attr.id === id ? { ...attr, ...updates } : attr)));
    };

    const removeAttribute = (id: string) => {
        setAttributes((a) => a.filter((x) => x.id !== id));
    };

    // ── Constraints ───────────────────────────────────────
    const addConstraint = () => {
        setConstraints((c) => [
            ...c,
            {
                id: generateId(),
                field: '',
                operator: 'eq',
                value: '',
                type: 'hard',
            },
        ]);
    };

    const updateConstraint = (id: string, updates: Partial<FormConstraint>) => {
        setConstraints((c) => c.map((con) => (con.id === id ? { ...con, ...updates } : con)));
    };

    const removeConstraint = (id: string) => {
        setConstraints((c) => c.filter((x) => x.id !== id));
    };

    // ── Validation ────────────────────────────────────────
    const validateStep1 = (): boolean => {
        const errs: Record<string, string> = {};
        if (!name.trim()) errs.name = 'Event name is required';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const validateStep2 = (): boolean => {
        const errs: Record<string, string> = {};

        if (requiredFields.length === 0) {
            errs.requiredFields = 'Add at least one required field';
        }

        if (attributes.length === 0) {
            errs.attributes = 'Add at least one attribute';
        }

        attributes.forEach((attr, i) => {
            if (!attr.field) errs[`attr_${i}_field`] = 'Select a field';
            if (attr.type === 'ordinal' && !attr.scale.trim()) {
                errs[`attr_${i}_scale`] = 'Ordinal type requires a scale';
            }
            if (attr.type === 'numeric' && !attr.maxDistance.trim()) {
                errs[`attr_${i}_maxDistance`] = 'Numeric type requires max distance';
            }
        });

        // Check total weight sums roughly to 1
        const totalWeight = attributes.reduce((sum, a) => sum + a.weight, 0);
        if (attributes.length > 0 && (totalWeight < 0.95 || totalWeight > 1.05)) {
            errs.weights = `Weights should sum to 1.0 (currently ${totalWeight.toFixed(2)})`;
        }

        constraints.forEach((con, i) => {
            if (!con.field) errs[`con_${i}_field`] = 'Select a field';
            if (!con.value.trim()) errs[`con_${i}_value`] = 'Value is required';
        });

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    // ── Build payload ─────────────────────────────────────
    const buildPayload = (): CreateEventPayload => {
        const matchingConfig = {
            matchThreshold: Number(matchThreshold),
            requiredFields,
            attributes: attributes.map((a): AttributeConfig => {
                const attr: AttributeConfig = {
                    field: a.field,
                    type: a.type,
                    weight: a.weight,
                };
                if (a.type === 'ordinal' && a.scale) {
                    attr.config = {
                        scale: a.scale.split(',').map((s) => s.trim()),
                    };
                }
                if (a.type === 'numeric' && a.maxDistance) {
                    attr.config = { maxDistance: Number(a.maxDistance) };
                }
                return attr;
            }),
            constraints: constraints.map(
                (c): ConstraintRule => ({
                    field: c.field,
                    operator: c.operator,
                    value: parseConstraintValue(c.value, c.operator),
                    type: c.type,
                }),
            ),
        };

        return {
            name: name.trim(),
            description: description.trim() || null,
            matchingConfig,
            startsAt: startsAt ? new Date(startsAt).toISOString() : null,
            endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        };
    };

    const mutation = useMutation({
        mutationFn: async (payload: CreateEventPayload) => {
            const res = await fetch(`${BASE_URL}/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey,
                },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.message ?? `Failed: ${res.status}`);
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success('Event created successfully');
            onOpenChange(false);
            resetForm();
            router.refresh();
        },
        onError: (err: Error) => {
            toast.error('Failed to create event', { description: err.message });
        },
    });

    const handleNext = () => {
        if (step === 1 && validateStep1()) setStep(2);
        else if (step === 2 && validateStep2()) setStep(3);
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleCreate = () => {
        mutation.mutate(buildPayload());
    };

    return (
        <Sheet
            open={open}
            onOpenChange={(v) => {
                if (!v) resetForm();
                onOpenChange(v);
            }}
        >
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto px-0">
                <SheetHeader className="px-6">
                    <SheetTitle>Create Event</SheetTitle>
                    <SheetDescription>
                        {showAiPrompt && 'Describe your event and AI will configure it for you.'}
                        {!showAiPrompt && step === 1 && 'Set up the basic details for your event.'}
                        {!showAiPrompt && step === 2 && 'Configure how attendees will be matched.'}
                        {!showAiPrompt && step === 3 && 'Review everything before creating.'}
                    </SheetDescription>
                </SheetHeader>

                {/* Step indicator */}
                <div className="flex items-center gap-2 px-6">
                    {['Details', 'Matching', 'Review'].map((label, i) => (
                        <div key={label} className="flex-1">
                            <div
                                className={`h-1.5 rounded-full transition-colors ${
                                    step > i ? 'bg-primary' : step === i + 1 ? 'bg-primary/50' : 'bg-muted'
                                }`}
                            />
                            <p
                                className={`text-[10px] mt-1 text-center capitalize ${
                                    step >= i + 1 ? 'text-foreground font-medium' : 'text-muted-foreground'
                                }`}
                            >
                                {label}
                            </p>
                        </div>
                    ))}
                </div>

                <Separator />

                <div className="px-6 py-4 space-y-5 flex-1">
                    {/* ── AI Prompt Mode ── */}
                    {showAiPrompt && (
                        <div className="space-y-4">
                            <div className="bg-gradient-to-br from-violet-50/80 to-blue-50/80 dark:from-violet-950/20 dark:to-blue-950/20 border border-violet-200/50 dark:border-violet-800/30 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Brain className="h-5 w-5 text-violet-600" />
                                    <h4 className="text-sm font-semibold">AI Event Generator</h4>
                                </div>
                                <p className="text-xs text-muted-foreground mb-4">
                                    Describe what kind of event you&apos;re running and who you want to match. The AI will generate the event name,
                                    matching attributes, constraints, and thresholds.
                                </p>
                                <Textarea
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    placeholder={`Example: "I'm organizing a tech networking event for software engineers. I want to match people based on their programming languages, experience level (junior to principal), and interests like AI, web, mobile, DevOps. People in the same company shouldn't be matched."`}
                                    rows={5}
                                    className="bg-white dark:bg-background"
                                />
                                <div className="flex items-center gap-2 mt-3">
                                    <Button onClick={handleAiGenerate} disabled={aiLoading || !aiPrompt.trim()} className="gap-1.5">
                                        {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                                        {aiLoading ? 'Generating...' : 'Generate Config'}
                                    </Button>
                                    <Button variant="ghost" onClick={() => setShowAiPrompt(false)} disabled={aiLoading}>
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Step 1: Basic Info ── */}
                    {!showAiPrompt && step === 1 && (
                        <>
                            {/* AI generate button */}
                            <button
                                type="button"
                                onClick={() => setShowAiPrompt(true)}
                                className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed border-violet-300 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-950/20 hover:bg-violet-100/80 dark:hover:bg-violet-950/30 transition-colors group"
                            >
                                <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 text-white shrink-0">
                                    <Sparkles className="h-4 w-4" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-medium group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors">
                                        Generate with AI
                                    </p>
                                    <p className="text-xs text-muted-foreground">Describe your event and let AI configure the matching for you</p>
                                </div>
                            </button>

                            {/* Templates button */}
                            <button
                                type="button"
                                onClick={handleShowTemplates}
                                className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed border-muted-foreground/30 hover:bg-muted/50 transition-colors group"
                            >
                                <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-muted shrink-0">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-medium group-hover:text-foreground transition-colors">Start from Template</p>
                                    <p className="text-xs text-muted-foreground">Use a saved matching config as a starting point</p>
                                </div>
                            </button>

                            {/* Templates list */}
                            {showTemplates && (
                                <div className="space-y-2 border rounded-lg p-3">
                                    <p className="text-xs font-medium text-muted-foreground">Saved Templates</p>
                                    {templates.length === 0 ? (
                                        <p className="text-xs text-muted-foreground py-4 text-center">
                                            No templates saved yet. Create an event first, then use &quot;Save Template&quot; from the event drawer.
                                        </p>
                                    ) : (
                                        templates.map((t) => (
                                            <div
                                                key={t.id}
                                                className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer group"
                                                onClick={() => loadTemplate(t)}
                                            >
                                                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{t.name}</p>
                                                    <p className="text-[10px] text-muted-foreground">
                                                        {t.attributes.length} attr · {t.constraints.length} constraints · threshold {t.matchThreshold}
                                                        %
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteTemplate(t.id);
                                                        setTemplates((prev) => prev.filter((x) => x.id !== t.id));
                                                        toast('Template deleted');
                                                    }}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            <Separator />

                            <div className="space-y-2">
                                <Label htmlFor="event-name">
                                    Event Name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="event-name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. TechConnect Summit 2026"
                                />
                                {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="event-desc">Description</Label>
                                <Textarea
                                    id="event-desc"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Brief description of the event…"
                                    rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="starts-at">Starts At</Label>
                                    <Input id="starts-at" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="ends-at">Ends At</Label>
                                    <Input id="ends-at" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── Step 2: Matching Config ── */}
                    {!showAiPrompt && step === 2 && (
                        <>
                            {/* Match threshold */}
                            <div className="space-y-2">
                                <Label htmlFor="threshold">Match Threshold (%)</Label>
                                <Input
                                    id="threshold"
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={matchThreshold}
                                    onChange={(e) => setMatchThreshold(e.target.value)}
                                    className="w-28"
                                />
                                <p className="text-xs text-muted-foreground">Minimum score (0–100) for pairs to be considered a match.</p>
                            </div>

                            <Separator />

                            {/* Required fields */}
                            <div className="space-y-3">
                                <div>
                                    <Label>
                                        Required Fields <span className="text-red-500">*</span>
                                    </Label>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Profile fields that attendees must have. Attributes and constraints reference these fields.
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {requiredFields.map((field) => (
                                        <Badge key={field} variant="secondary" className="gap-1 capitalize pr-1">
                                            {field.replace(/_/g, ' ')}
                                            <button
                                                type="button"
                                                onClick={() => removeRequiredField(field)}
                                                className="ml-0.5 hover:bg-muted rounded-sm p-0.5"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>

                                <div className="flex gap-2">
                                    <Input
                                        value={newField}
                                        onChange={(e) => setNewField(e.target.value)}
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
                                {errors.newField && <p className="text-xs text-red-600">{errors.newField}</p>}
                                {errors.requiredFields && <p className="text-xs text-red-600">{errors.requiredFields}</p>}
                            </div>

                            <Separator />

                            {/* Attributes */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>
                                            Attributes <span className="text-red-500">*</span>
                                        </Label>
                                        <p className="text-xs text-muted-foreground mt-0.5">How each field is scored. Weights should sum to 1.0.</p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={addAttribute}
                                        disabled={requiredFields.length === 0}
                                        className="gap-1"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Add
                                    </Button>
                                </div>

                                {errors.attributes && <p className="text-xs text-red-600">{errors.attributes}</p>}
                                {errors.weights && (
                                    <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                        {errors.weights}
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {attributes.map((attr, i) => (
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
                                                {/* Field */}
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs">Field</Label>
                                                    <Select value={attr.field} onValueChange={(v) => updateAttribute(attr.id, { field: v })}>
                                                        <SelectTrigger className="h-9">
                                                            <SelectValue placeholder="Select field" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {requiredFields.map((f) => (
                                                                <SelectItem key={f} value={f}>
                                                                    <span className="capitalize">{f.replace(/_/g, ' ')}</span>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {errors[`attr_${i}_field`] && <p className="text-xs text-red-600">{errors[`attr_${i}_field`]}</p>}
                                                </div>

                                                {/* Type */}
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

                                            {/* Weight */}
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

                                            {/* Config: ordinal scale */}
                                            {attr.type === 'ordinal' && (
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs">Scale (comma-separated, low → high)</Label>
                                                    <Input
                                                        value={attr.scale}
                                                        onChange={(e) =>
                                                            updateAttribute(attr.id, {
                                                                scale: e.target.value,
                                                            })
                                                        }
                                                        placeholder="e.g. junior, mid, senior, lead"
                                                        className="h-9"
                                                    />
                                                    {errors[`attr_${i}_scale`] && <p className="text-xs text-red-600">{errors[`attr_${i}_scale`]}</p>}
                                                </div>
                                            )}

                                            {/* Config: numeric maxDistance */}
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
                                                    {errors[`attr_${i}_maxDistance`] && (
                                                        <p className="text-xs text-red-600">{errors[`attr_${i}_maxDistance`]}</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            {/* Constraints */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Constraints</Label>
                                        <p className="text-xs text-muted-foreground mt-0.5">Optional rules to filter or penalize matches.</p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={addConstraint}
                                        disabled={requiredFields.length === 0}
                                        className="gap-1"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Add
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    {constraints.map((con, i) => (
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
                                                {/* Field */}
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs">Field</Label>
                                                    <Select value={con.field} onValueChange={(v) => updateConstraint(con.id, { field: v })}>
                                                        <SelectTrigger className="h-9">
                                                            <SelectValue placeholder="Select field" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {requiredFields.map((f) => (
                                                                <SelectItem key={f} value={f}>
                                                                    <span className="capitalize">{f.replace(/_/g, ' ')}</span>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {errors[`con_${i}_field`] && <p className="text-xs text-red-600">{errors[`con_${i}_field`]}</p>}
                                                </div>

                                                {/* Operator */}
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
                                                {/* Value */}
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs">Value</Label>
                                                    <Input
                                                        value={con.value}
                                                        onChange={(e) =>
                                                            updateConstraint(con.id, {
                                                                value: e.target.value,
                                                            })
                                                        }
                                                        placeholder='e.g. "vip" or ["a","b"]'
                                                        className="h-9"
                                                    />
                                                    {errors[`con_${i}_value`] && <p className="text-xs text-red-600">{errors[`con_${i}_value`]}</p>}
                                                </div>

                                                {/* Type */}
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
                            </div>
                        </>
                    )}

                    {/* ── Step 3: Review ── */}
                    {!showAiPrompt && step === 3 && (
                        <div className="space-y-4">
                            {/* Event details */}
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold">Event Details</h4>
                                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Name</p>
                                        <p className="text-sm font-medium capitalize">{name}</p>
                                    </div>
                                    {description && (
                                        <div>
                                            <p className="text-xs text-muted-foreground">Description</p>
                                            <p className="text-sm">{description}</p>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Starts</p>
                                            <p className="text-sm">{startsAt || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Ends</p>
                                            <p className="text-sm">{endsAt || '—'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Config summary */}
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold">Matching Configuration</h4>
                                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Threshold</p>
                                            <p className="text-sm font-medium">{matchThreshold}%</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Required Fields</p>
                                            <p className="text-sm font-medium">{requiredFields.length}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Fields</p>
                                        <div className="flex flex-wrap gap-1">
                                            {requiredFields.map((f) => (
                                                <Badge key={f} variant="secondary" className="text-xs capitalize">
                                                    {f.replace(/_/g, ' ')}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>

                                    <Separator />

                                    <div>
                                        <p className="text-xs text-muted-foreground mb-2">Attributes ({attributes.length})</p>
                                        {attributes.map((attr) => (
                                            <div key={attr.id} className="flex items-center justify-between py-1.5">
                                                <div>
                                                    <p className="text-sm font-medium capitalize">{attr.field.replace(/_/g, ' ')}</p>
                                                    <p className="text-xs text-muted-foreground capitalize">
                                                        {attr.type.replace(/_/g, ' ')}
                                                        {attr.type === 'ordinal' && attr.scale && ` · ${attr.scale}`}
                                                        {attr.type === 'numeric' && attr.maxDistance && ` · max ${attr.maxDistance}`}
                                                    </p>
                                                </div>
                                                <Badge variant="outline" className="text-xs">
                                                    {Math.round(attr.weight * 100)}%
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>

                                    {constraints.length > 0 && (
                                        <>
                                            <Separator />
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-2">Constraints ({constraints.length})</p>
                                                {constraints.map((con) => (
                                                    <div key={con.id} className="flex items-center justify-between py-1.5">
                                                        <p className="text-sm capitalize">
                                                            {con.field.replace(/_/g, ' ')}{' '}
                                                            <span className="text-muted-foreground">{con.operator}</span> {con.value}
                                                        </p>
                                                        <Badge variant={con.type === 'hard' ? 'destructive' : 'secondary'} className="text-xs">
                                                            {con.type}
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {!showAiPrompt && (
                    <SheetFooter className="px-6 border-t pt-4">
                        <div className="flex w-full items-center justify-between">
                            <Button type="button" variant="outline" onClick={handleBack} disabled={step === 1} className="gap-1">
                                <ChevronLeft className="h-4 w-4" />
                                Back
                            </Button>

                            {step < 3 ? (
                                <Button type="button" onClick={handleNext} className="gap-1">
                                    Next
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            ) : (
                                <Button type="button" onClick={handleCreate} disabled={mutation.isPending} className="gap-1">
                                    {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Create Event
                                </Button>
                            )}
                        </div>
                    </SheetFooter>
                )}
            </SheetContent>
        </Sheet>
    );
}

// ── Helpers ──────────────────────────────────────────────

function parseConstraintValue(value: string, operator: ConstraintOperator): unknown {
    const trimmed = value.trim();

    // Array operators expect arrays
    if (operator === 'in' || operator === 'not_in') {
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) return parsed;
        } catch {
            // comma-separated fallback
            return trimmed.split(',').map((s) => s.trim());
        }
    }

    // Range expects [min, max]
    if (operator === 'range') {
        try {
            return JSON.parse(trimmed);
        } catch {
            return trimmed;
        }
    }

    // Numeric
    const num = Number(trimmed);
    if (!isNaN(num) && trimmed !== '') return num;

    return trimmed;
}
