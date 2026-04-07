import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zxhsjjbekyqqurmjuttm.supabase.co';
const supabaseAnonKey = 'sb_publishable_VaTMRRYxk-dJkxe2naNypw_IzwhnzLh';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});
