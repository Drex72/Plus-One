import { createClient, SupabaseClient as CustomSupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/common/database.interface';
import { config } from './config';

const { supabaseServiceKey, supabaseUrl } = config.db;

export type SupabaseClient = CustomSupabaseClient<Database>;

export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);
