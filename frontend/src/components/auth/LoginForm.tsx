'use client';

import { useActionState } from 'react';
import { loginAction } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export function LoginForm() {
    const [state, formAction, isPending] = useActionState(loginAction, null);

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
                        <span className="text-white font-bold text-lg">P1</span>
                    </div>
                    <CardTitle className="text-2xl">Sign in to Plus One</CardTitle>
                    <CardDescription>Enter your API key to access your tenant dashboard</CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={formAction} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="apiKey">API Key</Label>
                            <Input id="apiKey" name="apiKey" type="password" placeholder="po_xxxxxxxxxxxxxxxx" required autoFocus />
                        </div>

                        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

                        <Button type="submit" className="w-full" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sign In
                        </Button>
                    </form>

                    <p className="mt-6 text-center text-xs text-muted-foreground">Don&apos;t have an API key? Create a tenant via the API first.</p>
                </CardContent>
            </Card>
        </div>
    );
}
