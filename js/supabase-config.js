import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://alxyxinzjartgemugktu.supabase.co';
const supabaseKey = 'sb_secret_NefE7f_mMGqUojlsQ39_bg_J--G3F-r';

export const supabase = createClient(supabaseUrl, supabaseKey);