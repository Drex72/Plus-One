/**
 * seed-and-register.ts
 *
 * Simulates a realistic Plus One environment with natural-language profiles.
 * Attendees respond like real people — varied vocabulary, different abstraction
 * levels, abbreviations, and casual phrasing — so enrichment + semantic matching
 * can demonstrate their full strength.
 *
 *   1. Creates one tenant → gets an API key
 *   2. Creates 5 diverse events, each with unique matching configs
 *   3. Registers attendees (with profiles + preferences) for every event
 *
 * Usage:  npx ts-node -r dotenv/config scripts/seed-and-register.ts
 *
 * The server must be running (pnpm start:dev) before you execute this.
 */

const BASE_URL = `http://localhost:${process.env.PORT ?? 8000}/api/v1`;

// ─── Helpers ────────────────────────────────────────────

async function api<T = any>(method: string, path: string, body?: Record<string, unknown>, apiKey?: string): Promise<any> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['X-API-Key'] = apiKey;

    const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    const json = await res.json();

    if (!res.ok) {
        console.error(`❌  ${method} ${path} → ${res.status}`);
        console.error(JSON.stringify(json, null, 2));
        throw Object.assign(new Error(`API error: ${res.status}`), { status: res.status, json });
    }

    return json;
}

function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

// ─── Types ──────────────────────────────────────────────

interface Preference {
    field: string;
    value: unknown[];
    type: 'in' | 'range';
}

interface AttendeeData {
    name: string;
    email: string;
    profile: Record<string, unknown>;
    preferences: Preference[];
}

interface EventSeed {
    name: string;
    description: string;
    matchingConfig: Record<string, unknown>;
    startsAt: string;
    endsAt: string;
    attendees: AttendeeData[];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EVENT 1 — Tech Networking Mixer
//
// Tests: same skills described in wildly different wording
//   "machine learning" vs "AI" vs "deep learning" vs "neural nets"
//   "frontend" vs "UI engineering" vs "React dev" vs "building interfaces"
//   Natural-language goals with overlapping intent
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const techMixer: EventSeed = {
    name: 'TechConnect Summit 2026 — Networking Mixer',
    description: 'Fast-paced networking for tech professionals. Matched by skills, experience, industry, and what you want to get out of this event.',
    matchingConfig: {
        matchThreshold: 40,
        requiredFields: ['skills', 'industry', 'experience_level', 'age', 'goals'],
        attributes: [
            { field: 'skills', type: 'array_similarity', weight: 0.3, config: {} },
            { field: 'goals', type: 'array_similarity', weight: 0.25, config: {} },
            { field: 'industry', type: 'exact', weight: 0.15, config: {} },
            { field: 'experience_level', type: 'ordinal', weight: 0.15, config: { scale: ['junior', 'mid', 'senior', 'lead', 'executive'] } },
            { field: 'age', type: 'numeric', weight: 0.15, config: { maxDistance: 20 } },
        ],
        constraints: [{ field: 'age', operator: 'range', value: [18, 65], type: 'hard' }],
    },
    startsAt: '2026-03-15T09:00:00Z',
    endsAt: '2026-03-15T18:00:00Z',
    attendees: [
        {
            name: 'Alice Chen',
            email: 'alice.chen@techcorp.io',
            profile: {
                skills: ['machine learning', 'python scripting', 'cloud infrastructure'],
                industry: 'tech',
                experience_level: 'senior',
                age: 32,
                goals: ['find someone to start a company with', 'learn new things'],
            },
            preferences: [
                { field: 'experience_level', value: ['senior', 'lead'], type: 'in' },
                { field: 'age', value: [25, 40], type: 'range' },
            ],
        },
        {
            name: 'Bob Martinez',
            email: 'bob.m@finserv.com',
            profile: {
                skills: ['financial technology', 'distributed ledger', 'artificial intelligence'],
                industry: 'finance',
                experience_level: 'mid',
                age: 28,
                goals: ['meet people in the industry', 'recruit engineers'],
            },
            preferences: [{ field: 'industry', value: ['tech', 'finance'], type: 'in' }],
        },
        {
            name: 'Carol Johnson',
            email: 'carol.j@designhub.co',
            profile: {
                skills: ['user experience design', 'figma prototyping', 'wcag accessibility'],
                industry: 'tech',
                experience_level: 'senior',
                age: 35,
                goals: ['mentor junior designers', 'pick up new frameworks'],
            },
            preferences: [{ field: 'goals', value: ['learn new things', 'mentor junior designers'], type: 'in' }],
        },
        {
            name: 'David Kim',
            email: 'david.kim@robolab.ai',
            profile: {
                skills: ['deep learning', 'robotics engineering', 'embedded hardware'],
                industry: 'tech',
                experience_level: 'lead',
                age: 40,
                goals: ['angel investing opportunities', 'looking for a technical cofounder'],
            },
            preferences: [
                { field: 'experience_level', value: ['mid', 'senior', 'lead'], type: 'in' },
                { field: 'age', value: [25, 45], type: 'range' },
            ],
        },
        {
            name: 'Elena Volkov',
            email: 'elena.v@growthly.io',
            profile: {
                skills: ['digital marketing', 'growth hacking', 'web analytics'],
                industry: 'marketing',
                experience_level: 'mid',
                age: 27,
                goals: ['expand my network', 'discover new tools'],
            },
            preferences: [{ field: 'industry', value: ['tech', 'marketing'], type: 'in' }],
        },
        {
            name: 'Frank Osei',
            email: 'frank.o@cloudops.dev',
            profile: {
                skills: ['site reliability', 'container orchestration', 'infosec'],
                industry: 'tech',
                experience_level: 'senior',
                age: 33,
                goals: ['hire devops talent', 'learn about new cloud stuff'],
            },
            preferences: [{ field: 'skills', value: ['cloud infrastructure', 'site reliability', 'infosec'], type: 'in' }],
        },
        {
            name: 'Grace Liu',
            email: 'grace.liu@nlpstart.ai',
            profile: {
                skills: ['neural networks', 'natural language processing', 'python'],
                industry: 'tech',
                experience_level: 'mid',
                age: 29,
                goals: ['searching for a cofounder', 'meet fellow AI researchers'],
            },
            preferences: [
                { field: 'goals', value: ['find someone to start a company with'], type: 'in' },
                { field: 'age', value: [24, 36], type: 'range' },
            ],
        },
        {
            name: 'Hassan Ali',
            email: 'hassan.ali@paystream.co',
            profile: {
                skills: ['payment systems', 'regulatory compliance', 'banking APIs'],
                industry: 'finance',
                experience_level: 'senior',
                age: 38,
                goals: ['find investment deals', 'give back through mentoring'],
            },
            preferences: [{ field: 'industry', value: ['finance'], type: 'in' }],
        },
        {
            name: 'Irene Park',
            email: 'irene.park@brandco.kr',
            profile: {
                skills: ['brand strategy', 'visual identity', 'early-stage startups'],
                industry: 'design',
                experience_level: 'mid',
                age: 26,
                goals: ['looking for a cofounder', 'learn product design'],
            },
            preferences: [{ field: 'goals', value: ['looking for a cofounder', 'learn product design'], type: 'in' }],
        },
        {
            name: 'James Okafor',
            email: 'james.o@datajunior.ng',
            profile: {
                skills: ['data wrangling', 'python notebooks', 'intro to AI'],
                industry: 'tech',
                experience_level: 'junior',
                age: 23,
                goals: ['find a mentor', 'level up my skills'],
            },
            preferences: [{ field: 'experience_level', value: ['senior', 'lead'], type: 'in' }],
        },
        {
            name: 'Keiko Tanaka',
            email: 'keiko.t@hardtech.jp',
            profile: {
                skills: ['autonomous robots', 'circuit design', 'computer vision'],
                industry: 'tech',
                experience_level: 'senior',
                age: 36,
                goals: ['seek a cofounder for hardware startup', 'explore funding'],
            },
            preferences: [{ field: 'skills', value: ['deep learning', 'robotics engineering', 'embedded hardware'], type: 'in' }],
        },
        {
            name: "Liam O'Brien",
            email: 'liam.ob@contentlab.ie',
            profile: {
                skills: ['copywriting', 'SEO optimization', 'social media marketing'],
                industry: 'marketing',
                experience_level: 'junior',
                age: 24,
                goals: ['meet people', 'learn about the tech scene'],
            },
            preferences: [{ field: 'age', value: [20, 30], type: 'range' }],
        },
        {
            name: 'Maya Gupta',
            email: 'maya.g@bioventures.in',
            profile: {
                skills: ['AI for healthcare', 'biotech research', 'clinical data'],
                industry: 'healthcare',
                experience_level: 'lead',
                age: 42,
                goals: ['find investment opportunities', 'mentor young scientists'],
            },
            preferences: [{ field: 'industry', value: ['healthcare', 'tech'], type: 'in' }],
        },
        {
            name: 'Noah Fischer',
            email: 'noah.f@defiprotocol.de',
            profile: {
                skills: ['smart contracts', 'decentralized finance', 'cryptography'],
                industry: 'finance',
                experience_level: 'mid',
                age: 30,
                goals: ['find a business partner', 'talk to other web3 builders'],
            },
            preferences: [{ field: 'skills', value: ['distributed ledger', 'financial technology'], type: 'in' }],
        },
        {
            name: 'Olivia Santos',
            email: 'olivia.s@uxstudio.br',
            profile: {
                skills: ['UI design', 'design research', 'usability testing'],
                industry: 'design',
                experience_level: 'senior',
                age: 34,
                goals: ['recruit designers for my agency', 'stay up to date'],
            },
            preferences: [{ field: 'goals', value: ['learn product design', 'stay up to date'], type: 'in' }],
        },
        {
            name: 'Priya Nair',
            email: 'priya.n@mlplatform.in',
            profile: {
                skills: ['AI model deployment', 'MLOps pipelines', 'pytorch'],
                industry: 'tech',
                experience_level: 'senior',
                age: 31,
                goals: ['talk to other ML engineers', 'explore startup ideas'],
            },
            preferences: [
                { field: 'skills', value: ['machine learning', 'neural networks', 'python'], type: 'in' },
                { field: 'age', value: [26, 38], type: 'range' },
            ],
        },
    ],
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EVENT 2 — Startup Co-founder Speed Dating
//
// Tests: overlapping intent ("need a coder" vs "looking for CTO")
//   Domain variations: "health stuff" vs "medical AI" vs "digital health"
//   Free-form "looking_for" with very different phrasings for the same need
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const founderSpeedDating: EventSeed = {
    name: 'Founder Speed Dating — YC S26 Batch',
    description: 'Pair founders who complement each other: technical + business, diverse domains.',
    matchingConfig: {
        matchThreshold: 45,
        requiredFields: ['role', 'domain', 'stage', 'funding_raised', 'looking_for'],
        attributes: [
            { field: 'looking_for', type: 'array_similarity', weight: 0.35, config: {} },
            { field: 'domain', type: 'exact', weight: 0.2, config: {} },
            { field: 'stage', type: 'ordinal', weight: 0.2, config: { scale: ['idea', 'mvp', 'pre-seed', 'seed', 'series-a'] } },
            { field: 'funding_raised', type: 'numeric', weight: 0.15, config: { maxDistance: 500000 } },
            { field: 'role', type: 'exact', weight: 0.1, config: {} },
        ],
        constraints: [{ field: 'stage', operator: 'in', value: ['idea', 'mvp', 'pre-seed', 'seed'], type: 'hard' }],
    },
    startsAt: '2026-04-01T14:00:00Z',
    endsAt: '2026-04-01T18:00:00Z',
    attendees: [
        {
            name: 'Priya Sharma',
            email: 'priya@launchai.in',
            profile: {
                role: 'technical',
                domain: 'saas',
                stage: 'mvp',
                funding_raised: 0,
                looking_for: [
                    'need someone to handle the business side',
                    'a mentor who has scaled a SaaS before',
                    'introductions to angel investors',
                ],
            },
            preferences: [{ field: 'role', value: ['business', 'product'], type: 'in' }],
        },
        {
            name: 'Marcus Reed',
            email: 'marcus@stealth.vc',
            profile: {
                role: 'business',
                domain: 'fintech',
                stage: 'pre-seed',
                funding_raised: 150000,
                looking_for: ['an engineer who can build our MVP', 'seed funding', 'advice from experienced founders'],
            },
            preferences: [
                { field: 'role', value: ['technical'], type: 'in' },
                { field: 'funding_raised', value: [0, 250000], type: 'range' },
            ],
        },
        {
            name: 'Aiko Sato',
            email: 'aiko@healthos.jp',
            profile: {
                role: 'technical',
                domain: 'healthtech',
                stage: 'idea',
                funding_raised: 0,
                looking_for: ['a cofounder with medical industry background', 'someone who understands hospital workflows', 'pre-seed capital'],
            },
            preferences: [{ field: 'domain', value: ['healthtech'], type: 'in' }],
        },
        {
            name: 'Leo Costa',
            email: 'leo@payflow.br',
            profile: {
                role: 'business',
                domain: 'fintech',
                stage: 'seed',
                funding_raised: 400000,
                looking_for: ['a CTO to lead engineering', 'senior developers to hire'],
            },
            preferences: [{ field: 'stage', value: ['mvp', 'pre-seed', 'seed'], type: 'in' }],
        },
        {
            name: 'Fatima Al-Rashid',
            email: 'fatima@eduspark.ae',
            profile: {
                role: 'product',
                domain: 'edtech',
                stage: 'mvp',
                funding_raised: 50000,
                looking_for: [
                    'a developer who can build mobile apps',
                    'investors interested in education',
                    'guidance from someone who has done this before',
                ],
            },
            preferences: [{ field: 'looking_for', value: ['an engineer who can build our MVP', 'pre-seed capital'], type: 'in' }],
        },
        {
            name: 'Chen Wei',
            email: 'chen@deepml.cn',
            profile: {
                role: 'technical',
                domain: 'saas',
                stage: 'pre-seed',
                funding_raised: 100000,
                looking_for: ['someone who can sell', 'a go-to-market strategist', 'connections to enterprise buyers'],
            },
            preferences: [{ field: 'role', value: ['business'], type: 'in' }],
        },
        {
            name: 'Sarah Thompson',
            email: 'sarah@sustainability.co',
            profile: {
                role: 'business',
                domain: 'cleantech',
                stage: 'idea',
                funding_raised: 0,
                looking_for: ['a technical cofounder who cares about climate', 'grant funding', 'intro to cleantech accelerators'],
            },
            preferences: [{ field: 'stage', value: ['idea', 'mvp'], type: 'in' }],
        },
        {
            name: 'Dmitri Volkov',
            email: 'dmitri@cyberguard.ru',
            profile: {
                role: 'technical',
                domain: 'cybersecurity',
                stage: 'mvp',
                funding_raised: 75000,
                looking_for: ['a business cofounder', 'someone who can handle sales and BD', 'early-stage investment'],
            },
            preferences: [{ field: 'role', value: ['business', 'product'], type: 'in' }],
        },
        {
            name: 'Amara Okonkwo',
            email: 'amara@agrisolve.ng',
            profile: {
                role: 'product',
                domain: 'agritech',
                stage: 'seed',
                funding_raised: 200000,
                looking_for: ['backend engineers who know IoT', 'a mentor in agriculture tech', 'Series A investors'],
            },
            preferences: [{ field: 'domain', value: ['agritech', 'cleantech'], type: 'in' }],
        },
        {
            name: 'Ethan Müller',
            email: 'ethan@travelx.de',
            profile: {
                role: 'business',
                domain: 'traveltech',
                stage: 'pre-seed',
                funding_raised: 120000,
                looking_for: ['a full-stack developer', 'someone to build our booking platform', 'growth advice'],
            },
            preferences: [{ field: 'role', value: ['technical'], type: 'in' }],
        },
        {
            name: 'Lucia Fernandez',
            email: 'lucia@meditrack.ar',
            profile: {
                role: 'product',
                domain: 'healthtech',
                stage: 'mvp',
                funding_raised: 80000,
                looking_for: ['a developer with healthcare API experience', 'connections to hospital networks', 'funding for clinical pilots'],
            },
            preferences: [{ field: 'domain', value: ['healthtech'], type: 'in' }],
        },
        {
            name: 'Yusuf Kaya',
            email: 'yusuf@devhire.tr',
            profile: {
                role: 'technical',
                domain: 'saas',
                stage: 'pre-seed',
                funding_raised: 60000,
                looking_for: ['a partner who understands HR/recruiting', 'help with go-to-market', 'angel investors'],
            },
            preferences: [{ field: 'role', value: ['business', 'product'], type: 'in' }],
        },
    ],
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EVENT 3 — Sports & Fitness Buddy Match
//
// Tests: "basketball" vs "hoops" vs "team sports" vs "ball games"
//   "weight loss" vs "slim down" vs "shed pounds" vs "get lean"
//   "lifting" vs "strength training" vs "pumping iron" vs "resistance training"
//   Casual language, abbreviations, slang
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fitnessBuddy: EventSeed = {
    name: 'FitMatch — Find Your Workout Partner',
    description: 'Match gym-goers and casual athletes by workout preferences, schedule, fitness level, and training goals.',
    matchingConfig: {
        matchThreshold: 40,
        requiredFields: ['activities', 'fitness_level', 'schedule', 'age', 'goals'],
        attributes: [
            { field: 'activities', type: 'array_similarity', weight: 0.3, config: {} },
            { field: 'goals', type: 'array_similarity', weight: 0.25, config: {} },
            { field: 'schedule', type: 'array_similarity', weight: 0.2, config: {} },
            { field: 'fitness_level', type: 'ordinal', weight: 0.15, config: { scale: ['beginner', 'intermediate', 'advanced', 'elite'] } },
            { field: 'age', type: 'numeric', weight: 0.1, config: { maxDistance: 15 } },
        ],
        constraints: [{ field: 'age', operator: 'range', value: [16, 70], type: 'hard' }],
    },
    startsAt: '2026-03-01T00:00:00Z',
    endsAt: '2026-03-31T23:59:00Z',
    attendees: [
        {
            name: 'Marcus Johnson',
            email: 'marcus@fitlife.com',
            profile: {
                activities: ['pumping iron', 'HIIT circuits'],
                fitness_level: 'advanced',
                schedule: ['early mornings before work', 'weekdays only'],
                age: 30,
                goals: ['pack on muscle', 'get stronger'],
            },
            preferences: [{ field: 'fitness_level', value: ['advanced', 'elite'], type: 'in' }],
        },
        {
            name: 'Sara Lindberg',
            email: 'sara@yogaflow.se',
            profile: {
                activities: ['vinyasa yoga', 'pilates mat work', 'jogging'],
                fitness_level: 'intermediate',
                schedule: ['mornings', 'saturday and sunday'],
                age: 28,
                goals: ['improve flexibility', 'clear my head'],
            },
            preferences: [{ field: 'activities', value: ['vinyasa yoga', 'pilates mat work'], type: 'in' }],
        },
        {
            name: 'Andre Williams',
            email: 'andre@crossfitbox.com',
            profile: {
                activities: ['crossfit WODs', 'interval training', '5K runs'],
                fitness_level: 'advanced',
                schedule: ['after work evenings', 'monday through friday'],
                age: 32,
                goals: ['build endurance', 'compete in local events'],
            },
            preferences: [{ field: 'goals', value: ['build endurance', 'compete in local events'], type: 'in' }],
        },
        {
            name: 'Yuki Tanaka',
            email: 'yuki@martialfit.jp',
            profile: {
                activities: ['karate', 'bodyweight exercises'],
                fitness_level: 'advanced',
                schedule: ['evenings', 'weekends too'],
                age: 26,
                goals: ['learn self-defense', 'get more flexible'],
            },
            preferences: [{ field: 'activities', value: ['karate', 'bodyweight exercises'], type: 'in' }],
        },
        {
            name: 'Lisa Chen',
            email: 'lisa@runclub.com',
            profile: {
                activities: ['long-distance running', 'road cycling'],
                fitness_level: 'intermediate',
                schedule: ['early AM', 'weekends mostly'],
                age: 34,
                goals: ['trim down a bit', 'improve stamina'],
            },
            preferences: [{ field: 'schedule', value: ['early AM', 'weekends mostly'], type: 'in' }],
        },
        {
            name: 'Tom Baker',
            email: 'tom@homegym.uk',
            profile: {
                activities: ['weight training', 'calisthenics basics'],
                fitness_level: 'beginner',
                schedule: ['evenings after 6pm', 'weekdays'],
                age: 22,
                goals: ['build muscle mass', 'learn proper lifting form'],
            },
            preferences: [{ field: 'fitness_level', value: ['intermediate', 'advanced'], type: 'in' }],
        },
        {
            name: 'Priyanka Das',
            email: 'priyanka@dancefit.in',
            profile: {
                activities: ['zumba classes', 'hot yoga', 'high intensity workouts'],
                fitness_level: 'intermediate',
                schedule: ['mornings or evenings', 'any day works'],
                age: 27,
                goals: ['shed some pounds', 'have fun exercising'],
            },
            preferences: [{ field: 'activities', value: ['zumba classes', 'hot yoga'], type: 'in' }],
        },
        {
            name: 'Erik Nilsson',
            email: 'erik@strongman.se',
            profile: {
                activities: ['powerlifting', 'strongman training'],
                fitness_level: 'elite',
                schedule: ['crack of dawn', 'weekday mornings'],
                age: 35,
                goals: ['compete at nationals', 'increase my deadlift PR'],
            },
            preferences: [{ field: 'fitness_level', value: ['advanced', 'elite'], type: 'in' }],
        },
        {
            name: 'Maria Gonzalez',
            email: 'maria@pilateslab.mx',
            profile: {
                activities: ['reformer pilates', 'gentle yoga', 'lap swimming'],
                fitness_level: 'intermediate',
                schedule: ['morning sessions', 'weekends preferred'],
                age: 40,
                goals: ['stay limber', 'recover from a back injury'],
            },
            preferences: [{ field: 'age', value: [30, 50], type: 'range' }],
        },
        {
            name: 'Jake Thompson',
            email: 'jake@mmafit.us',
            profile: {
                activities: ['mixed martial arts', 'HIIT', 'trail running'],
                fitness_level: 'advanced',
                schedule: ['evening classes', 'sat mornings'],
                age: 25,
                goals: ['train for amateur fights', 'self defense skills'],
            },
            preferences: [{ field: 'activities', value: ['mixed martial arts', 'HIIT'], type: 'in' }],
        },
        {
            name: 'Amina Okafor',
            email: 'amina@fitng.com',
            profile: {
                activities: ['basketball pickup games', 'sprinting drills'],
                fitness_level: 'intermediate',
                schedule: ['weekend afternoons', 'tuesday and thursday eves'],
                age: 24,
                goals: ['get faster for my rec league', 'overall conditioning'],
            },
            preferences: [{ field: 'age', value: [20, 30], type: 'range' }],
        },
        {
            name: 'Ryan Cooper',
            email: 'ryan@hoopcity.us',
            profile: {
                activities: ['hoops', 'agility ladders', 'resistance bands'],
                fitness_level: 'intermediate',
                schedule: ['after work', 'weekends free'],
                age: 27,
                goals: ['get in shape for basketball season', 'improve my vertical'],
            },
            preferences: [{ field: 'activities', value: ['hoops', 'agility ladders'], type: 'in' }],
        },
        {
            name: 'Sofia Ruiz',
            email: 'sofia@spinclass.mx',
            profile: {
                activities: ['indoor cycling', 'barre class', 'stretching'],
                fitness_level: 'beginner',
                schedule: ['lunch breaks', 'weekday mid-day'],
                age: 29,
                goals: ['lose weight', 'tone up my legs'],
            },
            preferences: [{ field: 'goals', value: ['lose weight', 'tone up my legs'], type: 'in' }],
        },
        {
            name: 'Daniel Park',
            email: 'daniel@climbfit.kr',
            profile: {
                activities: ['rock climbing', 'bouldering', 'pull-up training'],
                fitness_level: 'advanced',
                schedule: ['evenings', 'both weekdays and weekends'],
                age: 31,
                goals: ['send harder routes', 'build grip strength'],
            },
            preferences: [{ field: 'fitness_level', value: ['intermediate', 'advanced'], type: 'in' }],
        },
    ],
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EVENT 4 — Creative Professionals Meetup
//
// Tests: "graphic design" vs "visual design" vs "design work"
//   "photography" vs "shooting photos" vs "photojournalism"
//   "illustration" vs "drawing" vs "digital art"
//   Mixed formal and casual descriptors for the same creative disciplines
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const creativeMeetup: EventSeed = {
    name: 'Creative Collisions — Design & Art Meetup NYC',
    description: 'Pair creatives by their medium, aesthetic, toolkit, and what they want to collaborate on.',
    matchingConfig: {
        matchThreshold: 35,
        requiredFields: ['medium', 'style', 'tools', 'years_experience', 'collab_interest'],
        attributes: [
            { field: 'medium', type: 'array_similarity', weight: 0.25, config: {} },
            { field: 'style', type: 'exact', weight: 0.2, config: {} },
            { field: 'tools', type: 'array_similarity', weight: 0.2, config: {} },
            { field: 'years_experience', type: 'numeric', weight: 0.15, config: { maxDistance: 15 } },
            { field: 'collab_interest', type: 'array_similarity', weight: 0.2, config: {} },
        ],
        constraints: [],
    },
    startsAt: '2026-03-22T18:00:00Z',
    endsAt: '2026-03-22T21:00:00Z',
    attendees: [
        {
            name: 'Mia Laurent',
            email: 'mia@studiomia.fr',
            profile: {
                medium: ['hand-drawn illustration', 'print design'],
                style: 'minimalist',
                tools: ['figma', 'procreate on iPad'],
                years_experience: 8,
                collab_interest: ['brand identity projects', 'magazine layouts'],
            },
            preferences: [{ field: 'style', value: ['minimalist', 'modern'], type: 'in' }],
        },
        {
            name: 'Raj Patel',
            email: 'raj@pixelcraft.in',
            profile: {
                medium: ['interface design', 'motion graphics'],
                style: 'bold',
                tools: ['figma', 'after effects for animation'],
                years_experience: 5,
                collab_interest: ['app UI/UX work', 'animated explainer videos'],
            },
            preferences: [{ field: 'tools', value: ['figma', 'after effects for animation'], type: 'in' }],
        },
        {
            name: 'Sofia Bianchi',
            email: 'sofia@tipolab.it',
            profile: {
                medium: ['type design', 'print and editorial'],
                style: 'classic',
                tools: ['adobe indesign', 'illustrator'],
                years_experience: 12,
                collab_interest: ['book and magazine design', 'packaging and labels'],
            },
            preferences: [{ field: 'years_experience', value: [5, 20], type: 'range' }],
        },
        {
            name: 'Kwame Asante',
            email: 'kwame@brightpixel.gh',
            profile: {
                medium: ['user interface mockups', 'logo and branding'],
                style: 'vibrant',
                tools: ['figma', 'adobe illustrator'],
                years_experience: 4,
                collab_interest: ['branding for startups', 'pitch deck design'],
            },
            preferences: [{ field: 'collab_interest', value: ['branding for startups', 'pitch deck design'], type: 'in' }],
        },
        {
            name: 'Hannah Müller',
            email: 'hannah@motionhaus.de',
            profile: {
                medium: ['animated videos', '3D rendering'],
                style: 'futuristic',
                tools: ['cinema 4d', 'after effects'],
                years_experience: 7,
                collab_interest: ['animation for film', 'music video visuals'],
            },
            preferences: [{ field: 'medium', value: ['animated videos', '3D rendering'], type: 'in' }],
        },
        {
            name: 'Yuki Nakamura',
            email: 'yuki@paperink.jp',
            profile: {
                medium: ['digital drawing', 'editorial illustration'],
                style: 'whimsical',
                tools: ['procreate', 'photoshop'],
                years_experience: 6,
                collab_interest: ['editorial artwork', "children's book illustration"],
            },
            preferences: [{ field: 'style', value: ['whimsical', 'classic'], type: 'in' }],
        },
        {
            name: 'Carlos Reyes',
            email: 'carlos@brandlab.mx',
            profile: {
                medium: ['corporate branding', 'product packaging'],
                style: 'bold',
                tools: ['illustrator', 'figma'],
                years_experience: 9,
                collab_interest: ['consumer packaging design', 'brand identity systems'],
            },
            preferences: [{ field: 'medium', value: ['corporate branding', 'product packaging'], type: 'in' }],
        },
        {
            name: 'Emma Wilson',
            email: 'emma@3dstudio.uk',
            profile: {
                medium: ['3D modeling', 'product visualization'],
                style: 'photorealistic',
                tools: ['blender 3D', 'cinema 4d'],
                years_experience: 3,
                collab_interest: ['product rendering for e-commerce', 'architectural walkthroughs'],
            },
            preferences: [{ field: 'tools', value: ['blender 3D', 'cinema 4d'], type: 'in' }],
        },
        {
            name: 'Tao Chen',
            email: 'tao@lenscn.com',
            profile: {
                medium: ['portrait photography', 'street photography'],
                style: 'documentary',
                tools: ['lightroom', 'sony alpha camera'],
                years_experience: 10,
                collab_interest: ['photo essays', 'gallery exhibitions'],
            },
            preferences: [{ field: 'years_experience', value: [5, 15], type: 'range' }],
        },
        {
            name: 'Nia Brooks',
            email: 'nia@shootnyc.us',
            profile: {
                medium: ['fashion shoots', 'commercial photo work'],
                style: 'editorial',
                tools: ['capture one', 'photoshop retouching'],
                years_experience: 7,
                collab_interest: ['fashion campaigns', 'product photo shoots'],
            },
            preferences: [{ field: 'collab_interest', value: ['fashion campaigns', 'product photo shoots'], type: 'in' }],
        },
        {
            name: 'Luca De Luca',
            email: 'luca@pixelart.it',
            profile: {
                medium: ['digital art', 'concept art for games'],
                style: 'fantasy',
                tools: ['clip studio paint', 'photoshop'],
                years_experience: 5,
                collab_interest: ['video game concept art', 'DnD campaign illustration'],
            },
            preferences: [{ field: 'medium', value: ['digital art', 'concept art for games'], type: 'in' }],
        },
        {
            name: 'Zara Williams',
            email: 'zara@webdesignco.uk',
            profile: {
                medium: ['website design', 'landing pages'],
                style: 'modern',
                tools: ['figma', 'webflow'],
                years_experience: 4,
                collab_interest: ['SaaS product design', 'startup branding'],
            },
            preferences: [{ field: 'style', value: ['modern', 'minimalist'], type: 'in' }],
        },
    ],
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EVENT 5 — Music Jam Session Matchmaker
//
// Tests: "jazz" vs "improvisational music" vs "smooth jazz" vs "bebop"
//   "guitar" vs "six-string" vs "acoustic guitar" vs "electric guitar"
//   "hip-hop" vs "rap" vs "beats" vs "urban music"
//   Genre and instrument synonyms, stylistic overlaps
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const musicJam: EventSeed = {
    name: 'JamSync — Find Your Bandmates Austin',
    description: 'Pair musicians by instruments, genre taste, skill, experience, and when they can jam.',
    matchingConfig: {
        matchThreshold: 35,
        requiredFields: ['instruments', 'genres', 'skill_level', 'years_playing', 'availability'],
        attributes: [
            { field: 'genres', type: 'array_similarity', weight: 0.3, config: {} },
            { field: 'instruments', type: 'array_similarity', weight: 0.25, config: {} },
            { field: 'availability', type: 'array_similarity', weight: 0.2, config: {} },
            { field: 'skill_level', type: 'ordinal', weight: 0.15, config: { scale: ['beginner', 'intermediate', 'advanced', 'professional'] } },
            { field: 'years_playing', type: 'numeric', weight: 0.1, config: { maxDistance: 20 } },
        ],
        constraints: [],
    },
    startsAt: '2026-04-12T19:00:00Z',
    endsAt: '2026-04-12T23:00:00Z',
    attendees: [
        {
            name: 'Jordan Bell',
            email: 'jordan@jamsync.com',
            profile: {
                instruments: ['drum kit', 'hand percussion'],
                genres: ['jazz standards', 'funk grooves', 'fusion jams'],
                skill_level: 'advanced',
                years_playing: 12,
                availability: ['weeknight evenings', 'all day weekends'],
            },
            preferences: [{ field: 'genres', value: ['jazz standards', 'funk grooves'], type: 'in' }],
        },
        {
            name: 'Mia Torres',
            email: 'mia@guitarista.mx',
            profile: {
                instruments: ['acoustic guitar', 'ukulele strumming'],
                genres: ['indie folk', 'singer-songwriter', 'alt rock'],
                skill_level: 'intermediate',
                years_playing: 6,
                availability: ['saturdays and sundays'],
            },
            preferences: [{ field: 'instruments', value: ['bass guitar', 'vocals', 'drum kit'], type: 'in' }],
        },
        {
            name: 'Akira Sato',
            email: 'akira@bassgroove.jp',
            profile: {
                instruments: ['electric bass', 'synth pads'],
                genres: ['smooth jazz', 'electronic', 'jazz fusion'],
                skill_level: 'professional',
                years_playing: 18,
                availability: ['weeknight evenings', 'weekends open'],
            },
            preferences: [{ field: 'skill_level', value: ['advanced', 'professional'], type: 'in' }],
        },
        {
            name: 'Lily Evans',
            email: 'lily@vocalize.uk',
            profile: {
                instruments: ['lead vocals', 'keyboard accompaniment'],
                genres: ['neo-soul', 'jazz vocals', 'R&B'],
                skill_level: 'advanced',
                years_playing: 10,
                availability: ['weekend afternoons'],
            },
            preferences: [{ field: 'genres', value: ['neo-soul', 'jazz vocals', 'R&B'], type: 'in' }],
        },
        {
            name: 'Carlos Mendez',
            email: 'carlos@brasslab.co',
            profile: {
                instruments: ['trumpet', 'flugelhorn'],
                genres: ['latin jazz', 'big band', 'funk'],
                skill_level: 'professional',
                years_playing: 15,
                availability: ['wednesday and friday eves'],
            },
            preferences: [{ field: 'instruments', value: ['drum kit', 'electric bass', 'keyboard accompaniment'], type: 'in' }],
        },
        {
            name: 'Nora Andersen',
            email: 'nora@keysound.no',
            profile: {
                instruments: ['piano', 'analog synthesizer'],
                genres: ['indie electronica', 'ambient', 'dream pop'],
                skill_level: 'intermediate',
                years_playing: 5,
                availability: ['weekends', 'some weeknight evenings'],
            },
            preferences: [{ field: 'genres', value: ['indie electronica', 'ambient'], type: 'in' }],
        },
        {
            name: 'Rashid Owens',
            email: 'rashid@beatmaker.us',
            profile: {
                instruments: ['beat production', 'drum machine', 'MPC sampler'],
                genres: ['hip-hop beats', 'lo-fi', 'funk samples'],
                skill_level: 'advanced',
                years_playing: 8,
                availability: ['late nights weekdays'],
            },
            preferences: [{ field: 'instruments', value: ['lead vocals', 'acoustic guitar'], type: 'in' }],
        },
        {
            name: 'Fiona McCarthy',
            email: 'fiona@fiddle.ie',
            profile: {
                instruments: ['fiddle', 'classical violin'],
                genres: ['traditional Irish music', 'Celtic folk', 'chamber music'],
                skill_level: 'professional',
                years_playing: 20,
                availability: ['weekend sessions'],
            },
            preferences: [{ field: 'genres', value: ['traditional Irish music', 'Celtic folk'], type: 'in' }],
        },
        {
            name: 'Tomás Silva',
            email: 'tomas@bossanova.br',
            profile: {
                instruments: ['nylon-string guitar', 'singing'],
                genres: ['bossa nova', 'MPB', 'Latin jazz crossover'],
                skill_level: 'advanced',
                years_playing: 14,
                availability: ['weeknights after 7', 'sundays'],
            },
            preferences: [{ field: 'genres', value: ['bossa nova', 'Latin jazz crossover'], type: 'in' }],
        },
        {
            name: 'Chloe Park',
            email: 'chloe@kpopvocal.kr',
            profile: {
                instruments: ['singing', 'choreography'],
                genres: ['K-pop', 'pop', 'contemporary R&B'],
                skill_level: 'intermediate',
                years_playing: 4,
                availability: ['weekends only'],
            },
            preferences: [{ field: 'years_playing', value: [3, 12], type: 'range' }],
        },
        {
            name: 'Dev Ramirez',
            email: 'dev@rapflows.us',
            profile: {
                instruments: ['rapping', 'lyric writing'],
                genres: ['conscious hip-hop', 'rap', 'spoken word'],
                skill_level: 'advanced',
                years_playing: 9,
                availability: ['weeknights', 'saturday nights'],
            },
            preferences: [{ field: 'instruments', value: ['beat production', 'drum machine'], type: 'in' }],
        },
        {
            name: 'Ingrid Holm',
            email: 'ingrid@choirvoice.se',
            profile: {
                instruments: ['soprano vocals', 'harmonium'],
                genres: ['choral music', 'folk harmonies', 'Scandinavian folk'],
                skill_level: 'advanced',
                years_playing: 11,
                availability: ['tuesday and thursday evenings', 'sunday mornings'],
            },
            preferences: [{ field: 'genres', value: ['folk harmonies', 'choral music'], type: 'in' }],
        },
    ],
};

// ─── All Events ──────────────────────────────────────────

const ALL_EVENTS: EventSeed[] = [techMixer, founderSpeedDating, fitnessBuddy, creativeMeetup, musicJam];

// ─── Main ───────────────────────────────────────────────

async function main() {
    console.log('🚀  Plus One — Full Seed & Register Simulation\n');
    console.log(`    Target: ${BASE_URL}`);
    console.log(`    Events: ${ALL_EVENTS.length}`);
    console.log(`    Total attendees: ${ALL_EVENTS.reduce((s, e) => s + e.attendees.length, 0)}\n`);

    // ── Step 1: Create Tenant (or login if already exists) ──
    console.log('━━━ Step 1: Creating Tenant ━━━');
    let tenant: any;
    let API_KEY: string;

    try {
        const tenantRes = await api('POST', '/tenants', {
            name: 'PlusOne Demo Org',
            webhook_endpoint: 'https://httpbin.org/post',
            metadata: { plan: 'enterprise', region: 'global', company_size: '50-200' },
        });
        tenant = tenantRes.data;
        API_KEY = tenant.apiKey;
        console.log(`   ✅ Tenant created: ${tenant.name}`);
    } catch (err: any) {
        if (err.status === 409) {
            // Tenant already exists — look up the API key directly from Supabase
            console.log('   ℹ️  Tenant exists, fetching API key from DB…');
            const { createClient: createSB } = await import('@supabase/supabase-js');
            const sbTenant = createSB(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
            const { data } = await sbTenant.from('tenants').select('*').eq('name', 'plusone demo org').is('deleted_at', null).single();
            if (!data) throw new Error('Tenant exists but could not fetch from DB');
            API_KEY = data.api_key;
            tenant = { name: data.name, id: data.id, apiKey: data.api_key };
            console.log(`   ✅ Logged in: ${tenant.name}`);
        } else {
            throw err;
        }
    }
    console.log(`   🔑 API Key: ${API_KEY}\n`);

    // ── Step 1b: Clean up existing data for this tenant ─
    console.log('━━━ Cleaning up existing data ━━━');
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

    // Delete in order: matches → matching_jobs → attendees → events (FK constraints)
    await sb.from('matches').delete().eq('tenant_id', tenant.id);
    await sb.from('matching_jobs').delete().eq('tenant_id', tenant.id);
    await sb.from('attendees').delete().eq('tenant_id', tenant.id);
    await sb.from('events').delete().eq('tenant_id', tenant.id);
    console.log('   🗑️  Cleared existing events, attendees & matches\n');

    const eventIds: string[] = [];

    // ── Step 2: Create & populate each event ────────────
    for (let ei = 0; ei < ALL_EVENTS.length; ei++) {
        const seed = ALL_EVENTS[ei];
        const num = ei + 1;

        console.log(`━━━ Event ${num}/${ALL_EVENTS.length}: ${seed.name} ━━━`);

        // Create event
        const eventRes = await api(
            'POST',
            '/events',
            {
                name: seed.name,
                description: seed.description,
                matchingConfig: seed.matchingConfig,
                startsAt: seed.startsAt,
                endsAt: seed.endsAt,
            },
            API_KEY,
        );
        const event = eventRes.data;
        eventIds.push(event.id);
        console.log(`   📋 Created (${event.id.slice(0, 8)}…) — threshold: ${seed.matchingConfig.matchThreshold}%`);

        // Activate
        await api('PATCH', `/events/${event.id}`, { status: 'active' }, API_KEY);
        console.log(`   ✅ Activated`);

        // Register attendees
        const total = seed.attendees.length;
        for (let ai = 0; ai < total; ai++) {
            const att = seed.attendees[ai];

            await api(
                'POST',
                `/attendees/${event.id}`,
                {
                    name: att.name,
                    email: att.email,
                    profile: att.profile,
                    preferences: att.preferences,
                },
                API_KEY,
            );

            const done = ai + 1;
            const bar = '█'.repeat(done) + '░'.repeat(total - done);
            process.stdout.write(`   [${bar}] ${String(done).padStart(2)}/${total}  ${att.name.padEnd(22)}\r`);

            // Small delay between attendees
            if (ai < total - 1) await sleep(300);
        }

        console.log(`   [${'█'.repeat(total)}] ${total}/${total}  ✅ All registered            `);
        console.log('');
    }

    // ── Summary ─────────────────────────────────────────
    const totalAtt = ALL_EVENTS.reduce((s, e) => s + e.attendees.length, 0);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ✅  SEED COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  Tenant:     ${tenant.name}`);
    console.log(`  API Key:    ${API_KEY}`);
    console.log(`  Events:     ${ALL_EVENTS.length}`);
    console.log(`  Attendees:  ${totalAtt}`);
    console.log('');
    console.log('  Events created:');
    ALL_EVENTS.forEach((e, i) => {
        console.log(`    ${i + 1}. ${e.name} (${e.attendees.length} attendees, threshold: ${e.matchingConfig.matchThreshold}%)`);
    });
    console.log('');
    console.log('  Semantic matching highlights to watch for:');
    console.log('    • Tech: "machine learning" ↔ "deep learning" ↔ "neural networks" ↔ "AI"');
    console.log('    • Fitness: "pumping iron" ↔ "weight training" ↔ "powerlifting"');
    console.log('    • Fitness: "basketball pickup games" ↔ "hoops" (should match!)');
    console.log('    • Music: "hip-hop beats" ↔ "rap" ↔ "conscious hip-hop"');
    console.log('    • Creative: "hand-drawn illustration" ↔ "digital drawing" ↔ "editorial illustration"');
    console.log('    • Founders: "need someone to handle business" ↔ "a go-to-market strategist"');
    console.log('');
    console.log(`  To trigger matching on event 1:`);
    console.log(`  curl -X POST ${BASE_URL}/matching/${eventIds[0]}/match -H "X-API-Key: ${API_KEY}"`);
    console.log('');
    console.log('  To trigger ALL events:');
    eventIds.forEach((id, i) => {
        console.log(`  curl -X POST ${BASE_URL}/matching/${id}/match -H "X-API-Key: ${API_KEY}"  # Event ${i + 1}`);
    });
    console.log('');
}

main().catch((err) => {
    console.error('\n💥 Script failed:', err.message);
    process.exit(1);
});
