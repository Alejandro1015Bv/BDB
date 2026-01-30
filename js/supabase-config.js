import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://alxyxinzjartgemugktu.supabase.co';
const supabaseKey = 'sb_publishable_ahfhMKWEpeH7HWTYbcIgrg_NI0CZROY';

export const supabase = createClient(supabaseUrl, supabaseKey);