// Supabase bağlantı bilgileri.
// Project Settings → API sayfasından kopyala, buraya yapıştır.
// anon key public'tir, gizli tutmana gerek yok (RLS zaten yazmayı engelliyor).

const SUPABASE_URL = "BURAYA_PROJECT_URL";
const SUPABASE_ANON_KEY = "BURAYA_ANON_KEY";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
