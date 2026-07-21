// Supabase bağlantı bilgileri.
// anon/publishable key public'tir, gizli tutmana gerek yok (RLS zaten yazmayı engelliyor).

const SUPABASE_URL = "https://dmhlysvzyxdgmtatshyc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_-f2M0WSqxpmUSmBFnkHYKg_xBt4FvAg";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
