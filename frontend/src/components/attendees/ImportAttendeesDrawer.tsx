'use client';

import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSession } from '@/lib/hooks/useSession';
import { bulkRegisterAttendees } from '@/lib/api';
import { parseCsvToAttendees } from '@/lib/export';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type ParsedRow = {
    name: string;
    email?: string;
    profile: Record<string, unknown>;
};

interface ImportResult {
    successCount: number;
    errorCount: number;
    errors: Array<{ index: number; error: string }>;
}

interface Props {
    eventId: string;
    open: boolean;
    onClose: () => void;
    onImported: () => void;
}

export function ImportAttendeesDrawer({ eventId, open, onClose, onImported }: Props) {
    const { apiKey } = useSession();
    const fileRef = useRef<HTMLInputElement>(null);
    const [parsed, setParsed] = useState<ParsedRow[]>([]);
    const [parseError, setParseError] = useState<string | null>(null);
    const [result, setResult] = useState<ImportResult | null>(null);

    const importMutation = useMutation({
        mutationFn: async () => {
            const res = await bulkRegisterAttendees(apiKey, eventId, parsed);
            return res.data as unknown as ImportResult;
        },
        onSuccess: (data) => {
            setResult(data);
            onImported();
            if (data.errorCount === 0) {
                toast.success(`Imported ${data.successCount} attendees`);
            } else {
                toast.warning(`Imported ${data.successCount}, ${data.errorCount} failed`);
            }
        },
        onError: (err: Error) => toast.error('Import failed', { description: err.message }),
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setParseError(null);
        setResult(null);

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const text = ev.target?.result as string;
                const rows = parseCsvToAttendees(text);
                if (rows.length === 0) {
                    setParseError("No valid rows found. Ensure your CSV has a 'name' header.");
                    setParsed([]);
                    return;
                }
                if (rows.length > 500) {
                    setParseError(`CSV has ${rows.length} rows but the max is 500. Please split the file.`);
                    setParsed([]);
                    return;
                }
                setParsed(rows);
            } catch (err) {
                setParseError(err instanceof Error ? err.message : 'Failed to parse CSV');
                setParsed([]);
            }
        };
        reader.readAsText(file);
    };

    const handleReset = () => {
        setParsed([]);
        setParseError(null);
        setResult(null);
        if (fileRef.current) fileRef.current.value = '';
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    // Compute dynamic columns from parsed data
    const profileKeys = parsed.length > 0 ? Array.from(new Set(parsed.flatMap((r) => Object.keys(r.profile)))).slice(0, 4) : [];

    return (
        <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
            <SheetContent className="sm:max-w-lg w-full overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Import Attendees from CSV</SheetTitle>
                    <SheetDescription>
                        Upload a CSV file with at least a &quot;name&quot; column. Additional columns become attendee attributes.
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-4">
                    {/* Upload area */}
                    {parsed.length === 0 && !result && (
                        <div
                            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                            onClick={() => fileRef.current?.click()}
                        >
                            <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                            <p className="text-sm font-medium">Click to upload or drag and drop</p>
                            <p className="text-xs text-muted-foreground mt-1">CSV files up to 500 rows</p>
                            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
                        </div>
                    )}

                    {/* Parse error */}
                    {parseError && (
                        <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                            {parseError}
                        </div>
                    )}

                    {/* Preview */}
                    {parsed.length > 0 && !result && (
                        <>
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium">
                                    Preview ({parsed.length} attendee{parsed.length !== 1 ? 's' : ''})
                                </p>
                                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={handleReset}>
                                    <Trash2 className="h-3 w-3" />
                                    Clear
                                </Button>
                            </div>

                            <div className="border rounded-lg max-h-64 overflow-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-8">#</TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            {profileKeys.map((k) => (
                                                <TableHead key={k} className="capitalize">
                                                    {k.replace(/_/g, ' ')}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {parsed.slice(0, 20).map((row, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                                                <TableCell className="text-sm font-medium truncate max-w-[140px]">{row.name}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground truncate max-w-[140px]">
                                                    {row.email ?? '—'}
                                                </TableCell>
                                                {profileKeys.map((k) => (
                                                    <TableCell key={k} className="text-sm text-muted-foreground truncate max-w-[120px]">
                                                        {formatValue(row.profile[k])}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            {parsed.length > 20 && <p className="text-xs text-muted-foreground">… and {parsed.length - 20} more rows</p>}

                            <Button className="w-full gap-2" onClick={() => importMutation.mutate()} disabled={importMutation.isPending}>
                                {importMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                {importMutation.isPending ? 'Importing…' : `Import ${parsed.length} Attendee${parsed.length !== 1 ? 's' : ''}`}
                            </Button>
                        </>
                    )}

                    {/* Result */}
                    {result && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400">
                                <CheckCircle2 className="h-5 w-5 shrink-0" />
                                <div>
                                    <p className="font-medium text-sm">Import complete — {result.successCount} added</p>
                                    {result.errorCount > 0 && (
                                        <p className="text-xs mt-0.5">
                                            {result.errorCount} row{result.errorCount !== 1 ? 's' : ''} failed
                                        </p>
                                    )}
                                </div>
                            </div>

                            {result.errors.length > 0 && (
                                <div className="border rounded-lg p-3 space-y-1 max-h-40 overflow-auto">
                                    <p className="text-xs font-medium text-destructive mb-1">Errors:</p>
                                    {result.errors.map((e, i) => (
                                        <p key={i} className="text-xs text-muted-foreground">
                                            Row {e.index + 1}: {e.error}
                                        </p>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <Button variant="outline" className="flex-1" onClick={handleReset}>
                                    Import More
                                </Button>
                                <Button className="flex-1" onClick={handleClose}>
                                    Done
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}

function formatValue(val: unknown): string {
    if (val == null) return '—';
    if (Array.isArray(val)) return val.join(', ');
    return String(val);
}
