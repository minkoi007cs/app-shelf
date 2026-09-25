import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://dbzujfyfvxtewfhllice.supabase.co';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRienVqZnlmdnh0ZXdmaGxsaWNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NzA4MjMsImV4cCI6MjA4ODM0NjgyM30.ww-qkmIwWVugx8Fq4Sa3nYukghvOAq_3MEF2zNvSASk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
