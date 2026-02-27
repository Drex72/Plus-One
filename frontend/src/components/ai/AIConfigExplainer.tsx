'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Brain, Lightbulb, Scale, Target, ShieldCheck, ShieldAlert, Layers, Hash, ListChecks, Equal } from 'lucide-react';
import type { MatchingConfig, AttributeConfig, ConstraintRule } from '@/lib/types';

/* ── Human-readable descriptions per attribute type ────── */

function describeAttribute(attr: AttributeConfig): string {
    const name = attr.field.replace(/_/g, ' ');
    const pct = Math.round(attr.weight * 100);

    switch (attr.type) {
        case 'array_similarity':
            return `**${name}** (${pct}% weight) — Compares lists of values between attendees using set similarity. The more items they share (e.g. common interests or skills), the higher the score for this dimension.`;
        case 'ordinal':
            if (attr.config?.scale?.length) {
                const scaleStr = attr.config.scale.join(' → ');
                return `**${name}** (${pct}% weight) — Measures how close two attendees are on a ranked scale: ${scaleStr}. Attendees closer on this scale score higher.`;
            }
            return `**${name}** (${pct}% weight) — Compares ranked/ordered values. Attendees at similar levels score higher.`;
        case 'exact':
            return `**${name}** (${pct}% weight) — Requires an exact value match. Two attendees score 100% on this dimension if they share the same value, or 0% if they differ.`;
        case 'numeric':
            if (attr.config?.maxDistance) {
                return `**${name}** (${pct}% weight) — Measures numeric proximity. Scores decrease linearly as the difference grows, reaching 0% at a distance of ${attr.config.maxDistance}.`;
            }
            return `**${name}** (${pct}% weight) — Compares numeric values. Closer values receive higher scores.`;
        default:
            return `**${name}** (${pct}% weight) — Used in scoring.`;
    }
}

function describeConstraint(c: ConstraintRule): string {
    const name = c.field.replace(/_/g, ' ');
    const val = typeof c.value === 'object' ? JSON.stringify(c.value) : String(c.value);

    const enforcement =
        c.type === 'hard'
            ? 'This is a **hard** constraint — pairs that violate it are excluded entirely.'
            : "This is a **soft** constraint — pairs that violate it receive a score penalty but aren't excluded.";

    switch (c.operator) {
        case 'eq':
            return `Attendees must have matching values for **${name}** (equal to ${val}). ${enforcement}`;
        case 'neq':
            return `Attendees must have different values for **${name}** (not equal to ${val}). ${enforcement}`;
        case 'in':
            return `The **${name}** field must be one of ${val}. ${enforcement}`;
        case 'not_in':
            return `The **${name}** field must NOT be one of ${val}. ${enforcement}`;
        case 'range':
            return `The **${name}** field must fall within the range ${val}. ${enforcement}`;
        case 'gte':
            return `The **${name}** field must be at least ${val}. ${enforcement}`;
        case 'lte':
            return `The **${name}** field must be at most ${val}. ${enforcement}`;
        default:
            return `Rule on **${name}**: ${c.operator} ${val}. ${enforcement}`;
    }
}

const typeIcons: Record<string, React.ReactNode> = {
    array_similarity: <Layers className="h-3.5 w-3.5" />,
    ordinal: <ListChecks className="h-3.5 w-3.5" />,
    exact: <Equal className="h-3.5 w-3.5" />,
    numeric: <Hash className="h-3.5 w-3.5" />,
};

/* ── Markdown-lite renderer (bold only) ─────────────── */

function RichText({ text }: { text: string }) {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return (
        <span>
            {parts.map((part, i) =>
                part.startsWith('**') && part.endsWith('**') ? (
                    <strong key={i} className="font-semibold text-foreground">
                        {part.slice(2, -2)}
                    </strong>
                ) : (
                    <span key={i}>{part}</span>
                ),
            )}
        </span>
    );
}

/* ═══════════════════════════════════════════════════════ */

export function AIConfigExplainer({ config }: { config: MatchingConfig }) {
    const attributes = config.attributes ?? [];
    const constraints = config.constraints ?? [];
    const requiredFields = config.requiredFields ?? [];
    const threshold = config.matchThreshold ?? 60;

    /* ── Generate dynamic summary ──────────────────────── */

    const summary = useMemo(() => {
        if (attributes.length === 0) {
            return 'No matching attributes have been configured yet. Add attributes to define how attendees will be scored against each other.';
        }

        const topAttr = [...attributes].sort((a, b) => b.weight - a.weight)[0];
        const topName = topAttr.field.replace(/_/g, ' ');
        const topPct = Math.round(topAttr.weight * 100);

        const hasSimilarity = attributes.some((a) => a.type === 'array_similarity');
        const hasExact = attributes.some((a) => a.type === 'exact');
        const hasOrdinal = attributes.some((a) => a.type === 'ordinal');
        const hasNumeric = attributes.some((a) => a.type === 'numeric');

        const hardConstraints = constraints.filter((c) => c.type === 'hard');

        let text = `This event uses ${attributes.length} scoring dimension${attributes.length > 1 ? 's' : ''} `;
        text += `to compare attendees. The most influential factor is **${topName}** at **${topPct}%** weight. `;

        if (hasSimilarity && hasExact) {
            text += 'The engine blends shared-interest similarity with exact-match criteria for well-rounded pairing. ';
        } else if (hasSimilarity) {
            text += 'The engine focuses on shared interests and overlapping attributes. ';
        } else if (hasExact) {
            text += 'The engine prioritizes precise value matching between attendees. ';
        }

        if (hasOrdinal) text += 'Ranked dimensions ensure attendees at similar levels are paired together. ';
        if (hasNumeric) text += 'Numeric proximity scoring adds precision for quantitative fields. ';

        text += `Pairs must score at least **${threshold}%** to qualify as a match.`;

        if (hardConstraints.length > 0) {
            text += ` There ${hardConstraints.length === 1 ? 'is' : 'are'} **${hardConstraints.length}** hard constraint${
                hardConstraints.length > 1 ? 's' : ''
            } that will outright block incompatible pairs.`;
        }

        return text;
    }, [attributes, constraints, threshold]);

    if (attributes.length === 0 && constraints.length === 0) return null;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-blue-500/20">
                    <Brain className="h-4 w-4 text-violet-600" />
                </div>
                <div>
                    <h4 className="text-sm font-semibold">AI Matching Insights</h4>
                    <p className="text-[11px] text-muted-foreground">How this event&apos;s matching engine works</p>
                </div>
            </div>

            {/* Summary card */}
            <div className="bg-gradient-to-br from-violet-50/80 to-blue-50/80 dark:from-violet-950/20 dark:to-blue-950/20 border border-violet-200/50 dark:border-violet-800/30 rounded-lg p-4">
                <div className="flex gap-2">
                    <Lightbulb className="h-4 w-4 text-violet-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        <RichText text={summary} />
                    </p>
                </div>
            </div>

            {/* Required fields */}
            {requiredFields.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                        <Target className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Required Profile Fields</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Attendees must provide these fields in their profile to be included in the matching pool.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {requiredFields.map((f) => (
                            <Badge key={f} variant="outline" className="text-xs capitalize">
                                {f.replace(/_/g, ' ')}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}

            <Separator />

            {/* Attributes explanations */}
            {attributes.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-1.5">
                        <Scale className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Scoring Dimensions</p>
                    </div>
                    <div className="space-y-2">
                        {attributes.map((attr, i) => (
                            <div key={i} className="bg-muted/50 rounded-lg px-3 py-2.5 border border-border/40">
                                <div className="flex items-start gap-2">
                                    <span className="mt-0.5 text-violet-600">{typeIcons[attr.type] ?? <Layers className="h-3.5 w-3.5" />}</span>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        <RichText text={describeAttribute(attr)} />
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Constraints explanations */}
            {constraints.length > 0 && (
                <>
                    <Separator />
                    <div className="space-y-3">
                        <div className="flex items-center gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Matching Rules</p>
                        </div>
                        <div className="space-y-2">
                            {constraints.map((con, i) => (
                                <div
                                    key={i}
                                    className={`rounded-lg px-3 py-2.5 border ${
                                        con.type === 'hard'
                                            ? 'bg-red-50/50 border-red-200/50 dark:bg-red-950/10 dark:border-red-800/30'
                                            : 'bg-amber-50/50 border-amber-200/50 dark:bg-amber-950/10 dark:border-amber-800/30'
                                    }`}
                                >
                                    <div className="flex items-start gap-2">
                                        {con.type === 'hard' ? (
                                            <ShieldAlert className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                                        ) : (
                                            <ShieldCheck className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                                        )}
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            <RichText text={describeConstraint(con)} />
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
