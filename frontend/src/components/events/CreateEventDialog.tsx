'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '@/lib/hooks/useSession';
import type { CreateEventPayload } from '@/lib/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1';

const stepOneSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    description: z.string().max(2000).optional(),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
});

type StepOneValues = z.infer<typeof stepOneSchema>;

export function CreateEventDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const { apiKey } = useSession();
    const router = useRouter();
    const [step, setStep] = useState(1);

    const form = useForm<StepOneValues>({
        defaultValues: { name: '', description: '', startsAt: '', endsAt: '' },
    });

    const mutation = useMutation({
        mutationFn: async (data: StepOneValues) => {
            const payload: CreateEventPayload = {
                name: data.name,
                description: data.description || null,
                startsAt: data.startsAt ? new Date(data.startsAt).toISOString() : null,
                endsAt: data.endsAt ? new Date(data.endsAt).toISOString() : null,
            };

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
            form.reset();
            setStep(1);
            router.refresh();
        },
        onError: (err: Error) => {
            toast.error('Failed to create event', { description: err.message });
        },
    });

    const handleSubmit = form.handleSubmit((data) => {
        if (step === 1) {
            setStep(2);
        } else {
            mutation.mutate(data);
        }
    });

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                if (!v) {
                    form.reset();
                    setStep(1);
                }
                onOpenChange(v);
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Create Event</DialogTitle>
                    <DialogDescription>
                        {step === 1 ? 'Enter the basic information for your event.' : 'Review and confirm your event details.'}
                    </DialogDescription>
                </DialogHeader>

                {/* Step indicator */}
                <div className="flex items-center gap-2 mb-2">
                    <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
                    <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {step === 1 && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="name">Event Name *</Label>
                                <Input
                                    id="name"
                                    {...form.register('name', { required: 'Name is required' })}
                                    placeholder="e.g. TechConnect Summit 2026"
                                />
                                {form.formState.errors.name && <p className="text-xs text-red-600">{form.formState.errors.name.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea id="description" {...form.register('description')} placeholder="Brief description of the event…" rows={3} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="startsAt">Starts At</Label>
                                    <Input id="startsAt" type="datetime-local" {...form.register('startsAt')} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="endsAt">Ends At</Label>
                                    <Input id="endsAt" type="datetime-local" {...form.register('endsAt')} />
                                </div>
                            </div>
                        </>
                    )}

                    {step === 2 && (
                        <div className="space-y-3 bg-muted/50 rounded-lg p-4">
                            <div>
                                <p className="text-xs text-muted-foreground">Name</p>
                                <p className="text-sm font-medium">{form.getValues('name')}</p>
                            </div>
                            {form.getValues('description') && (
                                <div>
                                    <p className="text-xs text-muted-foreground">Description</p>
                                    <p className="text-sm">{form.getValues('description')}</p>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-xs text-muted-foreground">Starts</p>
                                    <p className="text-sm">{form.getValues('startsAt') || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Ends</p>
                                    <p className="text-sm">{form.getValues('endsAt') || '—'}</p>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">You can configure matching settings after creation.</p>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        {step === 2 && (
                            <Button type="button" variant="outline" onClick={() => setStep(1)}>
                                Back
                            </Button>
                        )}
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {step === 1 ? 'Next' : 'Create Event'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
