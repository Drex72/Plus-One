'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useSession } from '@/lib/hooks/useSession';
import { updateTenant, rotateApiKey } from '@/lib/api';
import { Copy, Eye, EyeOff, Key, Loader2, RefreshCw, Save, User, Webhook } from 'lucide-react';
import { toast } from 'sonner';
import type { Session } from '@/lib/types';

export function SettingsContent({ session }: { session: Session }) {
    const { apiKey } = useSession();
    const [name, setName] = useState(session.tenant.name);
    const [webhookEndpoint, setWebhookEndpoint] = useState(session.tenant.webhookEndpoint ?? '');
    const [showKey, setShowKey] = useState(false);
    const [currentKey, setCurrentKey] = useState(session.tenant.apiKey);

    const updateMutation = useMutation({
        mutationFn: () =>
            updateTenant(apiKey, {
                name: name !== session.tenant.name ? name : undefined,
                webhook_endpoint: webhookEndpoint || null,
            }),
        onSuccess: () => {
            toast.success('Settings saved');
        },
        onError: (err: Error) => toast.error('Save failed', { description: err.message }),
    });

    const rotateMutation = useMutation({
        mutationFn: () => rotateApiKey(apiKey),
        onSuccess: (res) => {
            const newKey = res.data.apiKey;
            setCurrentKey(newKey);
            // Update session cookie
            document.cookie = `plusone_api_key=${newKey}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
            toast.success('API key rotated', {
                description: 'Your old key is now invalid. Update your integrations.',
                duration: 8000,
            });
        },
        onError: (err: Error) => toast.error('Rotation failed', { description: err.message }),
    });

    const copyKey = () => {
        navigator.clipboard.writeText(currentKey);
        toast.success('API key copied to clipboard');
    };

    const maskedKey = currentKey ? `${currentKey.slice(0, 6)}${'•'.repeat(24)}${currentKey.slice(-4)}` : '';

    return (
        <div className="space-y-6">
            {/* Profile */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-base">Tenant Profile</CardTitle>
                    </div>
                    <CardDescription>Manage your organization details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Organization Name</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-muted-foreground">Tenant ID</p>
                            <p className="font-mono text-xs">{session.tenant.id}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Role</p>
                            <Badge variant={session.role === 'admin' ? 'default' : 'secondary'}>{session.role}</Badge>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Created</p>
                            <p>{new Date(session.tenant.createdAt).toLocaleDateString()}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Webhook */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Webhook className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-base">Webhook Configuration</CardTitle>
                    </div>
                    <CardDescription>Receive real-time notifications when matching events occur</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="webhook">Webhook Endpoint URL</Label>
                        <Input
                            id="webhook"
                            type="url"
                            placeholder="https://your-app.com/webhooks/plusone"
                            value={webhookEndpoint}
                            onChange={(e) => setWebhookEndpoint(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">We&apos;ll send POST requests here for match events, job completions, etc.</p>
                    </div>
                </CardContent>
            </Card>

            {/* Save */}
            <div className="flex justify-end">
                <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="gap-1.5">
                    {updateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save Settings
                </Button>
            </div>

            <Separator />

            {/* API Key */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Key className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-base">API Key</CardTitle>
                    </div>
                    <CardDescription>Use this key to authenticate API requests</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="flex-1 font-mono text-sm bg-muted rounded-lg px-3 py-2 overflow-hidden">
                            {showKey ? currentKey : maskedKey}
                        </div>
                        <Button variant="outline" size="icon" onClick={() => setShowKey(!showKey)}>
                            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button variant="outline" size="icon" onClick={copyKey}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="gap-1.5">
                                <RefreshCw className="h-3.5 w-3.5" />
                                Rotate API Key
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Rotate API Key?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will immediately invalidate your current API key. All existing integrations using the old key will stop
                                    working. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => rotateMutation.mutate()} disabled={rotateMutation.isPending}>
                                    {rotateMutation.isPending ? 'Rotating...' : 'Rotate Key'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>
        </div>
    );
}
