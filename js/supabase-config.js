// Configuración global de Supabase
const SUPABASE_URL = 'https://alxyxinzjartgemugktu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ahfhMKWEpeH7HWTYbcIgrg_NI0CZROY'; // Reemplaza con tu clave publica anon

// Crear el cliente e ir expuesto de manera global
if (typeof supabase !== 'undefined') {
  window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.error('La librería Supabase JS no se ha cargado correctamente.');
}