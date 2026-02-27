/**
 * clear-db.ts — Wipes all rows from the Supabase tables in the correct order
 * (respecting foreign key constraints).
 *
 * Usage:  npx ts-node -r dotenv/config scripts/clear-db.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌  Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Order matters — children before parents
const TABLES = ['webhook_deliveries', 'matches', 'matching_jobs', 'attendees', 'events', 'tenants'] as const;

async function clearAll() {
    console.log('🗑️  Clearing database…\n');

    for (const table of TABLES) {
        // delete all rows (gte id '' matches everything for uuid columns)
        const { error, count } = await supabase.from(table).delete({ count: 'exact' }).gte('id', '00000000-0000-0000-0000-000000000000');

        if (error) {
            console.error(`   ❌  ${table}: ${error.message}`);
        } else {
            console.log(`   ✅  ${table} — ${count ?? 0} rows deleted`);
        }
    }

    console.log('\n✨  Database cleared.');
}

clearAll().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
