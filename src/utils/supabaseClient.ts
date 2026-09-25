import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://msozshwatonyxnkaqjfs.supabase.co';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zb3pzaHdhdG9ueXhua2FxamZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MjU5MzYsImV4cCI6MjA4ODIwMTkzNn0.lbfHxn4YxXNLHB0uVBDInrHh8wsCbusDr1_SroACHgk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
