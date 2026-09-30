import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://tulbbtovxshzhtzrwvuv.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_mAN9A8LgzWLGd9BmHmyB3w_KUxp6n-y'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)