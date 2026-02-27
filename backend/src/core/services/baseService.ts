import { supabaseAdmin, SupabaseClient } from '../config';

export abstract class BaseService {
    protected supabase: SupabaseClient;

    constructor() {
        this.supabase = supabaseAdmin;
    }
}
