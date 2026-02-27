import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are an AI assistant for PlusOne, a SaaS event matching platform. You generate concise, friendly explanations for why two attendees were matched.

You will receive:
- The attendee names and their profile attributes
- The match score and score breakdown by field
- The matching configuration (attribute types and weights)

Write a 2-3 sentence human-readable explanation that:
1. Highlights the top 1-2 strongest scoring dimensions
2. Explains in plain language why they're compatible
3. Mentions any notable shared traits

Keep it conversational and encouraging. Do NOT mention numeric scores or percentages. Do NOT use bullet points. Write in third person.`;

export async function POST(req: NextRequest) {
    try {
        const { matches, config, attendees } = await req.json();

        if (!matches || !Array.isArray(matches) || matches.length === 0) {
            return NextResponse.json({ error: 'matches array is required' }, { status: 400 });
        }

        // Build individual prompts for each match
        const explanations: { matchId: string; explanation: string }[] = [];

        // Process in small batches to stay within rate limits
        const BATCH_SIZE = 5;
        for (let i = 0; i < matches.length; i += BATCH_SIZE) {
            const batch = matches.slice(i, i + BATCH_SIZE);

            const results = await Promise.all(
                batch.map(
                    async (match: {
                        id: string;
                        attendeeAId: string;
                        attendeeBId: string;
                        score: number;
                        scoreBreakdown: Record<string, number>;
                    }) => {
                        const attendeeA = attendees?.[match.attendeeAId];
                        const attendeeB = attendees?.[match.attendeeBId];

                        const userPrompt = `Match between "${attendeeA?.name ?? 'Attendee A'}" and "${attendeeB?.name ?? 'Attendee B'}":

Score: ${Math.round(match.score)}%
Breakdown: ${JSON.stringify(match.scoreBreakdown ?? {})}

Attendee A attributes: ${JSON.stringify(attendeeA?.attributes ?? {})}
Attendee B attributes: ${JSON.stringify(attendeeB?.attributes ?? {})}

Matching config attributes: ${JSON.stringify(config?.attributes ?? [])}`;

                        try {
                            const completion = await openai.chat.completions.create({
                                model: 'gpt-4o-mini',
                                temperature: 0.7,
                                max_tokens: 200,
                                messages: [
                                    { role: 'system', content: SYSTEM_PROMPT },
                                    { role: 'user', content: userPrompt },
                                ],
                            });

                            return {
                                matchId: match.id,
                                explanation: completion.choices[0]?.message?.content?.trim() ?? 'Match explanation unavailable.',
                            };
                        } catch {
                            return {
                                matchId: match.id,
                                explanation: 'Match explanation could not be generated.',
                            };
                        }
                    },
                ),
            );

            explanations.push(...results);
        }

        return NextResponse.json({ data: explanations });
    } catch (error: unknown) {
        console.error('[AI explain-matches]', error);
        const message = error instanceof Error ? error.message : 'Failed to generate explanations';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
