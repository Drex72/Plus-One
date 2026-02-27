import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are an expert event matching configuration generator for PlusOne, a SaaS platform that matches attendees at events.

Given a user's description of their event and who they want to match, generate a complete matching configuration.

The configuration must be a valid JSON object with EXACTLY this shape:
{
  "name": "string – event name",
  "description": "string – brief event description",
  "matchThreshold": number (0-100, recommended 50-70),
  "requiredFields": ["field_name_1", "field_name_2", ...],
  "attributes": [
    {
      "field": "field_name",
      "type": "array_similarity" | "ordinal" | "exact" | "numeric",
      "weight": number (0-1, all weights must sum to 1.0),
      "config": { ... } // optional, depends on type
    }
  ],
  "constraints": [
    {
      "field": "field_name",
      "operator": "eq" | "neq" | "in" | "not_in" | "range" | "gte" | "lte",
      "value": "any",
      "type": "hard" | "soft"
    }
  ]
}

Attribute type guidelines:
- "array_similarity": For arrays of values like interests, skills, hobbies. No config needed.
- "ordinal": For ranked values. Config must include "scale": ["low", "mid", "high"] (ordered low→high).
- "exact": For exact value matching like department, role, gender. No config needed.
- "numeric": For numeric distance like age, budget. Config must include "maxDistance": number.

required_fields should use snake_case (e.g. "experience_level", "interests", "industry").

Return ONLY valid JSON, no markdown, no explanation.`;

export async function POST(req: NextRequest) {
    try {
        const { prompt } = await req.json();

        if (!prompt || typeof prompt !== 'string') {
            return NextResponse.json({ error: 'A prompt describing the event is required' }, { status: 400 });
        }

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0.7,
            max_tokens: 2000,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: prompt },
            ],
        });

        const raw = completion.choices[0]?.message?.content?.trim() ?? '';

        // Strip markdown fences if the model wraps in ```json ... ```
        const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

        const config = JSON.parse(cleaned);

        return NextResponse.json({ data: config });
    } catch (error: unknown) {
        console.error('[AI generate-config]', error);
        const message = error instanceof Error ? error.message : 'Failed to generate config';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
